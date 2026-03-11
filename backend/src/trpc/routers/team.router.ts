import { TRPCError } from '@trpc/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import { teamMemberTable, teamTable, userTable } from '../../drizzle/schema.ts'
import { logActivity } from '../../services/activity.service.ts'
import { checkPermission, getUserTeamIds } from '../../services/rbac.service.ts'
import { adminProcedure, procedure, router } from '../trpc-init.ts'

export const teamRouter = router({
  /**
   * List teams. Admin sees all teams; others see only their own teams.
   */
  list: procedure.query(async ({ ctx }) => {
    if (ctx.auth.role === 'admin') {
      return db.query.teamTable.findMany({
        orderBy: (t, { asc }) => [asc(t.name)],
        with: {
          members: {
            columns: { userId: true, role: true },
          },
        },
      })
    }

    const teamIds = await getUserTeamIds(ctx.auth.userId)
    if (teamIds.length === 0) return []

    return db.query.teamTable.findMany({
      where: inArray(teamTable.id, teamIds),
      orderBy: (t, { asc }) => [asc(t.name)],
      with: {
        members: {
          columns: { userId: true, role: true },
        },
      },
    })
  }),

  /**
   * Get a single team by ID with its members (including user info).
   */
  get: procedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const team = await db.query.teamTable.findFirst({
        where: eq(teamTable.id, input.id),
        with: {
          members: {
            with: {
              user: {
                columns: { id: true, displayName: true, email: true },
              },
            },
          },
        },
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      // Non-admin users must be a member to view the team
      if (ctx.auth.role !== 'admin') {
        const isMember = team.members.some(
          (m) => m.userId === ctx.auth.userId,
        )
        if (!isMember) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this team',
          })
        }
      }

      return team
    }),

  /**
   * Create a new team (admin only).
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [team] = await db
        .insert(teamTable)
        .values({
          name: input.name,
          description: input.description,
          createdBy: ctx.auth.userId,
        })
        .returning()

      await logActivity({
        entityType: 'team',
        entityId: team!.id,
        action: 'created',
        actorId: ctx.auth.userId,
        details: { name: input.name },
      })

      return team
    }),

  /**
   * Update an existing team (admin only).
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.teamTable.findFirst({
        where: eq(teamTable.id, input.id),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      const [updated] = await db
        .update(teamTable)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        })
        .where(eq(teamTable.id, input.id))
        .returning()

      await logActivity({
        entityType: 'team',
        entityId: input.id,
        action: 'updated',
        actorId: ctx.auth.userId,
        details: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
        },
      })

      return updated
    }),

  /**
   * Add a member to a team. Requires team.manageMembers permission
   * (admin or team lead).
   */
  addMember: procedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(['lead', 'member']).default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await checkPermission(ctx.auth, 'team.manageMembers', {
        teamId: input.teamId,
      })
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage team members',
        })
      }

      // Verify team exists
      const team = await db.query.teamTable.findFirst({
        where: eq(teamTable.id, input.teamId),
      })
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      // Verify target user exists
      const targetUser = await db.query.userTable.findFirst({
        where: eq(userTable.id, input.userId),
      })
      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Check if already a member
      const existing = await db.query.teamMemberTable.findFirst({
        where: and(
          eq(teamMemberTable.teamId, input.teamId),
          eq(teamMemberTable.userId, input.userId),
        ),
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this team',
        })
      }

      await db.insert(teamMemberTable).values({
        teamId: input.teamId,
        userId: input.userId,
        role: input.role,
      })

      await logActivity({
        entityType: 'team',
        entityId: input.teamId,
        action: 'member_added',
        actorId: ctx.auth.userId,
        details: {
          userId: input.userId,
          displayName: targetUser.displayName,
          role: input.role,
        },
      })

      return { success: true }
    }),

  /**
   * Remove a member from a team. Requires team.manageMembers permission.
   */
  removeMember: procedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await checkPermission(ctx.auth, 'team.manageMembers', {
        teamId: input.teamId,
      })
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage team members',
        })
      }

      const membership = await db.query.teamMemberTable.findFirst({
        where: and(
          eq(teamMemberTable.teamId, input.teamId),
          eq(teamMemberTable.userId, input.userId),
        ),
      })
      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this team',
        })
      }

      await db
        .delete(teamMemberTable)
        .where(
          and(
            eq(teamMemberTable.teamId, input.teamId),
            eq(teamMemberTable.userId, input.userId),
          ),
        )

      await logActivity({
        entityType: 'team',
        entityId: input.teamId,
        action: 'member_removed',
        actorId: ctx.auth.userId,
        details: { userId: input.userId },
      })

      return { success: true }
    }),

  /**
   * Get members of a team with user details.
   */
  getMembers: procedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const team = await db.query.teamTable.findFirst({
        where: eq(teamTable.id, input.teamId),
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      // Non-admin must be a member to view the member list
      if (ctx.auth.role !== 'admin') {
        const teamIds = await getUserTeamIds(ctx.auth.userId)
        if (!teamIds.includes(input.teamId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not a member of this team',
          })
        }
      }

      const members = await db.query.teamMemberTable.findMany({
        where: eq(teamMemberTable.teamId, input.teamId),
        with: {
          user: {
            columns: { id: true, displayName: true, email: true, role: true },
          },
        },
        orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
      })

      return members
    }),
})
