import { TRPCError } from '@trpc/server'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import {
  predictionTable,
  questionTable,
} from '../../drizzle/schema.ts'
import { logActivity } from '../../services/activity.service.ts'
import { canViewQuestion } from '../../services/rbac.service.ts'
import { computeBrierScore } from '../../services/scoring.service.ts'
import { procedure, router } from '../trpc-init.ts'

export const predictionRouter = router({
  /**
   * Submit a new prediction (append-only).
   * Probability input is an integer 1-99 (representing %), stored as 0.01-0.99.
   */
  submit: procedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        probability: z.number().int().min(1).max(99),
        reasoning: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const question = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.questionId),
      })

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      if (question.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Predictions can only be submitted for open questions',
        })
      }

      // Check visibility
      const allowed = await canViewQuestion(ctx.auth, question)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this question',
        })
      }

      // Convert integer percentage to decimal (e.g., 75 -> 0.75)
      const probabilityDecimal = (input.probability / 100).toFixed(4)

      const [prediction] = await db
        .insert(predictionTable)
        .values({
          questionId: input.questionId,
          userId: ctx.auth.userId,
          probability: probabilityDecimal,
          reasoning: input.reasoning,
        })
        .returning()

      await logActivity({
        entityType: 'question',
        entityId: input.questionId,
        action: 'prediction_submitted',
        actorId: ctx.auth.userId,
        details: {
          predictionId: prediction!.id,
          probability: input.probability,
        },
      })

      return prediction
    }),

  /**
   * List predictions for a question.
   * Before resolution: only current user's own predictions + aggregate stats.
   * After resolution: all predictions with user details and Brier scores.
   */
  listByQuestion: procedure
    .input(
      z.object({
        questionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const question = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.questionId),
      })

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      const allowed = await canViewQuestion(ctx.auth, question)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this question',
        })
      }

      const isResolved =
        question.status === 'resolved_yes' ||
        question.status === 'resolved_no' ||
        question.status === 'ambiguous'

      if (!isResolved) {
        // Before resolution: own predictions + aggregate stats

        // Get current user's predictions
        const myPredictions = await db.query.predictionTable.findMany({
          where: and(
            eq(predictionTable.questionId, input.questionId),
            eq(predictionTable.userId, ctx.auth.userId),
          ),
          orderBy: (p, { desc: d }) => [d(p.createdAt)],
        })

        // Get aggregate stats from latest prediction per user
        const aggregateResult = await db.execute<{
          count: string
          mean: string | null
          median: string | null
        }>(sql`
          WITH latest AS (
            SELECT DISTINCT ON (p.user_id) p.probability
            FROM app.prediction p
            WHERE p.question_id = ${input.questionId}
            ORDER BY p.user_id, p.created_at DESC
          )
          SELECT
            COUNT(*)::text AS count,
            AVG(probability)::text AS mean,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY probability)::text AS median
          FROM latest
        `)

        const stats = aggregateResult.rows[0]

        return {
          status: 'open' as const,
          myPredictions,
          aggregate: {
            count: Number(stats?.count ?? 0),
            mean: stats?.mean ? Number(stats.mean) : null,
            median: stats?.median ? Number(stats.median) : null,
          },
        }
      }

      // After resolution: all predictions with user details and Brier scores
      // Get latest prediction per user
      const allLatest = await db.execute<{
        id: string
        question_id: string
        user_id: string
        probability: string
        reasoning: string | null
        created_at: string
        display_name: string
        email: string
      }>(sql`
        SELECT DISTINCT ON (p.user_id)
          p.id,
          p.question_id,
          p.user_id,
          p.probability,
          p.reasoning,
          p.created_at,
          u.display_name,
          u.email
        FROM app.prediction p
        INNER JOIN app."user" u ON u.id = p.user_id
        WHERE p.question_id = ${input.questionId}
        ORDER BY p.user_id, p.created_at DESC
      `)

      const predictions = allLatest.rows.map((row) => {
        const prob = Number(row.probability)
        const brierScore = computeBrierScore(
          prob,
          question.status as 'resolved_yes' | 'resolved_no' | 'ambiguous',
        )

        return {
          id: row.id,
          questionId: row.question_id,
          userId: row.user_id,
          probability: row.probability,
          reasoning: row.reasoning,
          createdAt: row.created_at,
          displayName: row.display_name,
          email: row.email,
          brierScore,
        }
      })

      // Sort by Brier score (lower is better) for resolved questions
      predictions.sort((a, b) => {
        if (a.brierScore === null && b.brierScore === null) return 0
        if (a.brierScore === null) return 1
        if (b.brierScore === null) return -1
        return a.brierScore - b.brierScore
      })

      return {
        status: 'resolved' as const,
        predictions,
        outcome: question.status,
      }
    }),

  /**
   * Get current user's full revision history for a question.
   * Returns all prediction rows (not just the latest) ordered by createdAt.
   */
  myHistory: procedure
    .input(z.object({ questionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const question = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.questionId),
      })

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      const allowed = await canViewQuestion(ctx.auth, question)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this question',
        })
      }

      const predictions = await db.query.predictionTable.findMany({
        where: and(
          eq(predictionTable.questionId, input.questionId),
          eq(predictionTable.userId, ctx.auth.userId),
        ),
        orderBy: (p, { asc }) => [asc(p.createdAt)],
      })

      return predictions
    }),

  /**
   * Get all predictions by the current user across all questions.
   * Includes question info and Brier score for resolved questions.
   */
  myPredictions: procedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input
      const offset = (page - 1) * pageSize

      // Get latest prediction per question for this user
      const latestPredictions = await db.execute<{
        id: string
        question_id: string
        probability: string
        reasoning: string | null
        created_at: string
        title: string
        status: string
        deadline: string
        category: string | null
        resolved_at: string | null
      }>(sql`
        WITH latest AS (
          SELECT DISTINCT ON (p.question_id)
            p.id,
            p.question_id,
            p.probability,
            p.reasoning,
            p.created_at
          FROM app.prediction p
          WHERE p.user_id = ${ctx.auth.userId}
          ORDER BY p.question_id, p.created_at DESC
        )
        SELECT
          l.id,
          l.question_id,
          l.probability,
          l.reasoning,
          l.created_at,
          q.title,
          q.status,
          q.deadline,
          q.category,
          q.resolved_at
        FROM latest l
        INNER JOIN app.question q ON q.id = l.question_id
        ORDER BY l.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `)

      // Get total count
      const countResult = await db.execute<{ total: string }>(sql`
        SELECT COUNT(DISTINCT question_id)::text AS total
        FROM app.prediction
        WHERE user_id = ${ctx.auth.userId}
      `)

      const total = Number(countResult.rows[0]?.total ?? 0)

      const items = latestPredictions.rows.map((row) => {
        const prob = Number(row.probability)
        const brierScore =
          row.status === 'resolved_yes' || row.status === 'resolved_no'
            ? computeBrierScore(
                prob,
                row.status as 'resolved_yes' | 'resolved_no',
              )
            : null

        return {
          id: row.id,
          questionId: row.question_id,
          probability: row.probability,
          reasoning: row.reasoning,
          createdAt: row.created_at,
          question: {
            title: row.title,
            status: row.status,
            deadline: row.deadline,
            category: row.category,
            resolvedAt: row.resolved_at,
          },
          brierScore,
        }
      })

      return { items, total, page, pageSize }
    }),
})
