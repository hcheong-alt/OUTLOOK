import { TRPCError } from '@trpc/server'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import {
  calibrationScoreTable,
  userTable,
} from '../../drizzle/schema.ts'
import {
  recomputeAllCalibration,
  recomputeUserCalibration,
} from '../../services/scoring.service.ts'
import { adminProcedure, procedure, router } from '../trpc-init.ts'

import cfg from '../../utils/cfg.ts'

const MIN_PREDICTIONS = cfg.scoring.leaderboard_min_predictions

export const calibrationRouter = router({
  /**
   * Get the current user's calibration scores across all periods.
   */
  myScores: procedure.query(async ({ ctx }) => {
    const scores = await db.query.calibrationScoreTable.findMany({
      where: eq(calibrationScoreTable.userId, ctx.auth.userId),
      orderBy: (s, { desc: d }) => [d(s.computedAt)],
    })
    return scores
  }),

  /**
   * Get a specific user's calibration scores.
   * Admin/moderator can view any user; analyst can only view own.
   */
  userScores: procedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Analyst can only view own scores
      if (
        ctx.auth.role === 'analyst' &&
        input.userId !== ctx.auth.userId
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own calibration scores',
        })
      }

      const scores = await db.query.calibrationScoreTable.findMany({
        where: eq(calibrationScoreTable.userId, input.userId),
        orderBy: (s, { desc: d }) => [d(s.computedAt)],
      })

      if (scores.length === 0) {
        // Verify user exists
        const user = await db.query.userTable.findFirst({
          where: eq(userTable.id, input.userId),
          columns: { id: true },
        })
        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }
      }

      return scores
    }),

  /**
   * Leaderboard ranked by Brier score (lower is better).
   * Only includes users with >= minimum resolved predictions.
   */
  leaderboard: procedure
    .input(
      z.object({
        period: z.string().default('all-time'),
        category: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      // Category filtering is not stored in calibration scores,
      // so we only filter by period here. Category support could
      // be added when per-category calibration is implemented.
      const results = await db
        .select({
          userId: calibrationScoreTable.userId,
          displayName: userTable.displayName,
          brierScore: calibrationScoreTable.brierScore,
          totalPredictions: calibrationScoreTable.totalPredictions,
          resolvedPredictions: calibrationScoreTable.resolvedPredictions,
        })
        .from(calibrationScoreTable)
        .innerJoin(
          userTable,
          eq(calibrationScoreTable.userId, userTable.id),
        )
        .where(
          sql`${calibrationScoreTable.period} = ${input.period}
            AND ${calibrationScoreTable.resolvedPredictions} >= ${MIN_PREDICTIONS}
            AND ${calibrationScoreTable.brierScore} IS NOT NULL`,
        )
        .orderBy(sql`${calibrationScoreTable.brierScore} ASC`)

      return results.map((row, index) => ({
        rank: index + 1,
        userId: row.userId,
        displayName: row.displayName,
        brierScore: row.brierScore ? Number(row.brierScore) : null,
        totalPredictions: row.totalPredictions,
        resolvedPredictions: row.resolvedPredictions,
      }))
    }),

  /**
   * Trigger recomputation of calibration scores (admin only).
   * Can recompute for all users or a specific user.
   */
  recompute: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.userId) {
        // Verify user exists
        const user = await db.query.userTable.findFirst({
          where: eq(userTable.id, input.userId),
          columns: { id: true },
        })
        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          })
        }

        await recomputeUserCalibration(input.userId)
        return { recomputed: 1 }
      }

      const result = await recomputeAllCalibration()
      return { recomputed: result.count }
    }),
})
