import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import { userTable } from '../../drizzle/schema.ts'
import type { UserPreferences } from '../../drizzle/schema.ts'
import { logActivity } from '../../services/activity.service.ts'
import { adminProcedure, procedure, router } from '../trpc-init.ts'

export const userRouter = router({
  /**
   * Get current authenticated user profile.
   * Returns the DB user record with the effective role from auth context
   * (which accounts for admin overrides via access control config).
   */
  get: procedure.query(async ({ ctx }) => {
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.auth.userId),
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return {
      ...user,
      role: ctx.auth.role,
    }
  }),

  /**
   * Merge partial preferences into the user's existing JSONB preferences.
   */
  updatePreferences: procedure
    .input(
      z.object({
        preferences: z.object({
          dashboard: z
            .object({
              widgets: z.array(z.string()).optional(),
              layout: z.string().optional(),
            })
            .optional(),
          charts: z
            .object({
              style: z.string().optional(),
            })
            .optional(),
          defaultVisibility: z
            .enum(['public', 'team', 'private'])
            .optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.userTable.findFirst({
        where: eq(userTable.id, ctx.auth.userId),
        columns: { preferences: true },
      })

      const merged: UserPreferences = {
        ...(existing?.preferences ?? {}),
        ...input.preferences,
      }

      if (input.preferences.dashboard) {
        merged.dashboard = {
          ...(existing?.preferences?.dashboard ?? {}),
          ...input.preferences.dashboard,
        }
      }

      if (input.preferences.charts) {
        merged.charts = {
          ...(existing?.preferences?.charts ?? {}),
          ...input.preferences.charts,
        }
      }

      const [updated] = await db
        .update(userTable)
        .set({ preferences: merged })
        .where(eq(userTable.id, ctx.auth.userId))
        .returning()

      return updated
    }),

  /**
   * List all users (admin only).
   */
  list: adminProcedure.query(async () => {
    const users = await db.query.userTable.findMany({
      orderBy: (u, { asc }) => [asc(u.displayName)],
    })
    return users
  }),

  /**
   * Update a user's role (admin only).
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(['admin', 'moderator', 'analyst']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await db.query.userTable.findFirst({
        where: eq(userTable.id, input.userId),
      })

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      const [updated] = await db
        .update(userTable)
        .set({ role: input.role })
        .where(eq(userTable.id, input.userId))
        .returning()

      await logActivity({
        entityType: 'user',
        entityId: input.userId,
        action: 'role_updated',
        actorId: ctx.auth.userId,
        details: {
          previousRole: target.role,
          newRole: input.role,
        },
      })

      return updated
    }),
})
