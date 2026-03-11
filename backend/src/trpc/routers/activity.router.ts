import { and, count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import {
  activityLogTable,
  userTable,
} from '../../drizzle/schema.ts'
import { getUserTeamIds } from '../../services/rbac.service.ts'
import { procedure, router } from '../trpc-init.ts'

export const activityRouter = router({
  /**
   * Paginated activity log for a specific entity (e.g., a question or team).
   */
  listByEntity: procedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, entityType, entityId } = input
      const offset = (page - 1) * pageSize

      const whereClause = and(
        eq(activityLogTable.entityType, entityType),
        eq(activityLogTable.entityId, entityId),
      )

      const [items, totalResult] = await Promise.all([
        db
          .select({
            id: activityLogTable.id,
            entityType: activityLogTable.entityType,
            entityId: activityLogTable.entityId,
            action: activityLogTable.action,
            actorId: activityLogTable.actorId,
            details: activityLogTable.details,
            createdAt: activityLogTable.createdAt,
            actorName: userTable.displayName,
          })
          .from(activityLogTable)
          .leftJoin(userTable, eq(activityLogTable.actorId, userTable.id))
          .where(whereClause)
          .orderBy(desc(activityLogTable.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ total: count() })
          .from(activityLogTable)
          .where(whereClause),
      ])

      const total = totalResult[0]?.total ?? 0

      return { items, total, page, pageSize }
    }),

  /**
   * Recent activity across questions the user can see.
   * Admin sees all activity; others see activity on public questions,
   * their own private questions, and team questions they belong to.
   */
  recent: procedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.auth.role === 'admin') {
        // Admin sees all question-related activity
        const items = await db
          .select({
            id: activityLogTable.id,
            entityType: activityLogTable.entityType,
            entityId: activityLogTable.entityId,
            action: activityLogTable.action,
            actorId: activityLogTable.actorId,
            details: activityLogTable.details,
            createdAt: activityLogTable.createdAt,
            actorName: userTable.displayName,
          })
          .from(activityLogTable)
          .leftJoin(userTable, eq(activityLogTable.actorId, userTable.id))
          .where(eq(activityLogTable.entityType, 'question'))
          .orderBy(desc(activityLogTable.createdAt))
          .limit(input.limit)

        return items
      }

      // Non-admin: filter to visible questions
      const teamIds = await getUserTeamIds(ctx.auth.userId)

      const visibilityFilter =
        teamIds.length > 0
          ? sql`(
              q.visibility = 'public'
              OR (q.visibility = 'private' AND q.created_by = ${ctx.auth.userId})
              OR (q.visibility = 'team' AND q.team_id IN (${sql.join(teamIds.map((id) => sql`${id}`), sql`, `)}))
            )`
          : sql`(
              q.visibility = 'public'
              OR (q.visibility = 'private' AND q.created_by = ${ctx.auth.userId})
            )`

      const items = await db.execute<{
        id: string
        entity_type: string
        entity_id: string
        action: string
        actor_id: string
        details: Record<string, unknown>
        created_at: string
        actor_name: string | null
      }>(sql`
        SELECT
          a.id,
          a.entity_type,
          a.entity_id,
          a.action,
          a.actor_id,
          a.details,
          a.created_at,
          u.display_name AS actor_name
        FROM app.activity_log a
        LEFT JOIN app."user" u ON u.id = a.actor_id
        INNER JOIN app.question q ON q.id = a.entity_id
        WHERE a.entity_type = 'question'
          AND ${visibilityFilter}
        ORDER BY a.created_at DESC
        LIMIT ${input.limit}
      `)

      return items.rows.map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        actorId: row.actor_id,
        details: row.details,
        createdAt: row.created_at,
        actorName: row.actor_name,
      }))
    }),
})
