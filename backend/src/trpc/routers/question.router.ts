import { TRPCError } from '@trpc/server'
import { and, count, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import {
  predictionTable,
  questionTable,
  userTable,
} from '../../drizzle/schema.ts'
import { logActivity } from '../../services/activity.service.ts'
import {
  canCancelQuestion,
  canEditQuestion,
  canViewQuestion,
  getUserTeamIds,
} from '../../services/rbac.service.ts'
import { recomputeUserCalibration } from '../../services/scoring.service.ts'
import {
  adminProcedure,
  moderatorProcedure,
  procedure,
  router,
} from '../trpc-init.ts'

const questionFiltersSchema = z.object({
  status: z
    .enum(['open', 'resolved_yes', 'resolved_no', 'ambiguous', 'cancelled'])
    .optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  myPredictionsOnly: z.boolean().optional(),
  unpredicted: z.boolean().optional(),
})

const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['createdAt', 'deadline', 'title', 'status'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  filters: questionFiltersSchema.default({}),
})

export const questionRouter = router({
  /**
   * Paginated, filterable list of questions.
   * Admin sees all; others see public + own private + team questions.
   * Returns items with prediction count and consensus probability.
   */
  list: procedure
    .input(listInputSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sort, sortDir, filters } = input
      const offset = (page - 1) * pageSize

      // Build visibility conditions
      const conditions: ReturnType<typeof eq>[] = []

      // Status filter
      if (filters.status) {
        conditions.push(eq(questionTable.status, filters.status))
      }

      // Category filter
      if (filters.category) {
        conditions.push(eq(questionTable.category, filters.category))
      }

      // Tag filter (array contains)
      if (filters.tag) {
        conditions.push(
          sql`${filters.tag} = ANY(${questionTable.tags})`,
        )
      }

      // Visibility scoping for non-admin users
      if (ctx.auth.role !== 'admin') {
        const teamIds = await getUserTeamIds(ctx.auth.userId)
        const visibilityCondition =
          teamIds.length > 0
            ? sql`(
                ${questionTable.visibility} = 'public'
                OR (${questionTable.visibility} = 'private' AND ${questionTable.createdBy} = ${ctx.auth.userId})
                OR (${questionTable.visibility} = 'team' AND ${questionTable.teamId} IN (${sql.join(teamIds.map((id) => sql`${id}`), sql`, `)}))
              )`
            : sql`(
                ${questionTable.visibility} = 'public'
                OR (${questionTable.visibility} = 'private' AND ${questionTable.createdBy} = ${ctx.auth.userId})
              )`
        conditions.push(visibilityCondition)
      }

      // myPredictionsOnly: only questions where user has made a prediction
      if (filters.myPredictionsOnly) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM app.prediction
            WHERE prediction.question_id = ${questionTable.id}
            AND prediction.user_id = ${ctx.auth.userId}
          )`,
        )
      }

      // unpredicted: only questions where user has NOT made a prediction
      if (filters.unpredicted) {
        conditions.push(
          sql`NOT EXISTS (
            SELECT 1 FROM app.prediction
            WHERE prediction.question_id = ${questionTable.id}
            AND prediction.user_id = ${ctx.auth.userId}
          )`,
        )
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined

      // Sort mapping
      const sortColumn = {
        createdAt: questionTable.createdAt,
        deadline: questionTable.deadline,
        title: questionTable.title,
        status: questionTable.status,
      }[sort]

      const orderBy =
        sortDir === 'asc' ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`

      // Fetch questions with creator info
      const [items, totalResult] = await Promise.all([
        db
          .select({
            id: questionTable.id,
            title: questionTable.title,
            description: questionTable.description,
            category: questionTable.category,
            resolutionCriteria: questionTable.resolutionCriteria,
            deadline: questionTable.deadline,
            status: questionTable.status,
            resolutionNotes: questionTable.resolutionNotes,
            resolvedAt: questionTable.resolvedAt,
            resolvedBy: questionTable.resolvedBy,
            createdBy: questionTable.createdBy,
            teamId: questionTable.teamId,
            tags: questionTable.tags,
            visibility: questionTable.visibility,
            createdAt: questionTable.createdAt,
            updatedAt: questionTable.updatedAt,
            creatorName: userTable.displayName,
          })
          .from(questionTable)
          .leftJoin(userTable, eq(questionTable.createdBy, userTable.id))
          .where(whereClause)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ total: count() })
          .from(questionTable)
          .where(whereClause),
      ])

      const total = totalResult[0]?.total ?? 0

      // Get prediction counts and consensus for all returned questions
      const questionIds = items.map((q) => q.id)

      if (questionIds.length === 0) {
        return { items: [], total, page, pageSize }
      }

      // Get latest prediction per user per question via DISTINCT ON
      const latestPredictions = await db.execute<{
        question_id: string
        probability: string
      }>(sql`
        SELECT DISTINCT ON (p.question_id, p.user_id)
          p.question_id,
          p.probability
        FROM app.prediction p
        WHERE p.question_id IN (${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)})
        ORDER BY p.question_id, p.user_id, p.created_at DESC
      `)

      // Aggregate per question
      const questionStats = new Map<
        string,
        { predictionCount: number; probabilitySum: number }
      >()

      for (const row of latestPredictions.rows) {
        const existing = questionStats.get(row.question_id)
        if (existing) {
          existing.predictionCount++
          existing.probabilitySum += Number(row.probability)
        } else {
          questionStats.set(row.question_id, {
            predictionCount: 1,
            probabilitySum: Number(row.probability),
          })
        }
      }

      const enrichedItems = items.map((q) => {
        const stats = questionStats.get(q.id)
        return {
          ...q,
          predictionCount: stats?.predictionCount ?? 0,
          consensusProbability: stats
            ? stats.probabilitySum / stats.predictionCount
            : null,
        }
      })

      return {
        items: enrichedItems,
        total,
        page,
        pageSize,
      }
    }),

  /**
   * Get a single question by ID with visibility check.
   * Includes prediction count and consensus stats.
   */
  get: procedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const question = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.id),
        with: {
          creator: {
            columns: { id: true, displayName: true, email: true },
          },
          resolver: {
            columns: { id: true, displayName: true },
          },
          team: {
            columns: { id: true, name: true },
          },
        },
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

      // Get latest prediction per user for consensus
      const latestPredictions = await db.execute<{
        user_id: string
        probability: string
      }>(sql`
        SELECT DISTINCT ON (p.user_id)
          p.user_id,
          p.probability
        FROM app.prediction p
        WHERE p.question_id = ${input.id}
        ORDER BY p.user_id, p.created_at DESC
      `)

      const predictionCount = latestPredictions.rows.length
      let consensusProbability: number | null = null
      let consensusMedian: number | null = null

      if (predictionCount > 0) {
        const probabilities = latestPredictions.rows
          .map((r: { probability: string }) => Number(r.probability))
          .sort((a: number, b: number) => a - b)

        const sum = probabilities.reduce((acc: number, p: number) => acc + p, 0)
        consensusProbability = sum / predictionCount

        const mid = Math.floor(predictionCount / 2)
        consensusMedian =
          predictionCount % 2 === 0
            ? (probabilities[mid - 1]! + probabilities[mid]!) / 2
            : probabilities[mid]!
      }

      return {
        ...question,
        predictionCount,
        consensusProbability,
        consensusMedian,
      }
    }),

  /**
   * Create a new question. Any authenticated user can create.
   */
  create: procedure
    .input(
      z.object({
        title: z.string().min(1).max(1000),
        resolutionCriteria: z.string().min(1).max(5000),
        deadline: z.date(),
        description: z.string().max(10000).optional(),
        category: z.string().max(200).optional(),
        tags: z.array(z.string().max(100)).max(20).optional(),
        visibility: z.enum(['public', 'team', 'private']).default('public'),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate: team visibility requires teamId
      if (input.visibility === 'team' && !input.teamId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Team visibility requires a teamId',
        })
      }

      const [question] = await db
        .insert(questionTable)
        .values({
          title: input.title,
          resolutionCriteria: input.resolutionCriteria,
          deadline: input.deadline,
          description: input.description,
          category: input.category,
          tags: input.tags,
          visibility: input.visibility,
          teamId: input.teamId,
          createdBy: ctx.auth.userId,
        })
        .returning()

      await logActivity({
        entityType: 'question',
        entityId: question!.id,
        action: 'created',
        actorId: ctx.auth.userId,
        details: {
          title: input.title,
          visibility: input.visibility,
          category: input.category,
        },
      })

      return question
    }),

  /**
   * Update an existing question. RBAC via canEditQuestion.
   */
  update: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(1000).optional(),
        description: z.string().max(10000).optional(),
        resolutionCriteria: z.string().min(1).max(5000).optional(),
        deadline: z.date().optional(),
        category: z.string().max(200).optional(),
        tags: z.array(z.string().max(100)).max(20).optional(),
        visibility: z.enum(['public', 'team', 'private']).optional(),
        teamId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.id),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      if (existing.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only open questions can be updated',
        })
      }

      const allowed = await canEditQuestion(ctx.auth, existing)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this question',
        })
      }

      // Validate visibility + teamId consistency
      const newVisibility = input.visibility ?? existing.visibility
      const newTeamId =
        input.teamId !== undefined ? input.teamId : existing.teamId
      if (newVisibility === 'team' && !newTeamId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Team visibility requires a teamId',
        })
      }

      const { id: _id, ...updateFields } = input

      const [updated] = await db
        .update(questionTable)
        .set(updateFields)
        .where(eq(questionTable.id, input.id))
        .returning()

      await logActivity({
        entityType: 'question',
        entityId: input.id,
        action: 'updated',
        actorId: ctx.auth.userId,
        details: { fields: Object.keys(updateFields) },
      })

      return updated
    }),

  /**
   * Resolve a question (moderator+ only).
   * Computes Brier scores and recomputes calibration for affected users.
   */
  resolve: moderatorProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        outcome: z.enum(['resolved_yes', 'resolved_no', 'ambiguous']),
        resolutionNotes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.id),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      if (existing.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only open questions can be resolved',
        })
      }

      const [resolved] = await db
        .update(questionTable)
        .set({
          status: input.outcome,
          resolvedAt: new Date(),
          resolvedBy: ctx.auth.userId,
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(questionTable.id, input.id))
        .returning()

      // For definitive outcomes, recompute calibration for all affected users
      if (input.outcome === 'resolved_yes' || input.outcome === 'resolved_no') {
        // Get distinct user IDs who have predictions on this question
        const latestPredictions = await db.execute<{
          user_id: string
          probability: string
        }>(sql`
          SELECT DISTINCT ON (p.user_id)
            p.user_id,
            p.probability
          FROM app.prediction p
          WHERE p.question_id = ${input.id}
          ORDER BY p.user_id, p.created_at DESC
        `)

        const affectedUserIds = latestPredictions.rows.map((r: { user_id: string }) => r.user_id)

        // Recompute calibration for each affected user (non-blocking errors)
        await Promise.allSettled(
          affectedUserIds.map((userId) => recomputeUserCalibration(userId)),
        )
      }

      await logActivity({
        entityType: 'question',
        entityId: input.id,
        action: 'resolved',
        actorId: ctx.auth.userId,
        details: {
          outcome: input.outcome,
          resolutionNotes: input.resolutionNotes,
        },
      })

      return resolved
    }),

  /**
   * Cancel a question. RBAC via canCancelQuestion (admin or creator).
   */
  cancel: procedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.id),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      if (existing.status !== 'open') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only open questions can be cancelled',
        })
      }

      const allowed = await canCancelQuestion(ctx.auth, existing)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to cancel this question',
        })
      }

      const [cancelled] = await db
        .update(questionTable)
        .set({
          status: 'cancelled',
          resolutionNotes: input.reason,
        })
        .where(eq(questionTable.id, input.id))
        .returning()

      await logActivity({
        entityType: 'question',
        entityId: input.id,
        action: 'cancelled',
        actorId: ctx.auth.userId,
        details: { reason: input.reason },
      })

      return cancelled
    }),

  /**
   * Hard delete a question (admin only).
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.questionTable.findFirst({
        where: eq(questionTable.id, input.id),
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      await db.delete(questionTable).where(eq(questionTable.id, input.id))

      await logActivity({
        entityType: 'question',
        entityId: input.id,
        action: 'deleted',
        actorId: ctx.auth.userId,
        details: { title: existing.title },
      })

      return { success: true }
    }),

  /**
   * Dashboard stats for the current user.
   */
  stats: procedure.query(async ({ ctx }) => {
    // Count open questions visible to the user
    const openCountResult = await db
      .select({ total: count() })
      .from(questionTable)
      .where(eq(questionTable.status, 'open'))

    const openQuestions = openCountResult[0]?.total ?? 0

    // Count questions the user has predicted on
    const myPredictionsResult = await db
      .selectDistinct({ questionId: predictionTable.questionId })
      .from(predictionTable)
      .where(eq(predictionTable.userId, ctx.auth.userId))

    const myPredictionCount = myPredictionsResult.length

    // Count resolved questions this user predicted on
    const resolvedWithPredictions = await db
      .selectDistinct({ questionId: predictionTable.questionId })
      .from(predictionTable)
      .innerJoin(questionTable, eq(predictionTable.questionId, questionTable.id))
      .where(
        and(
          eq(predictionTable.userId, ctx.auth.userId),
          inArray(questionTable.status, ['resolved_yes', 'resolved_no']),
        ),
      )

    const resolvedPredictionCount = resolvedWithPredictions.length

    // Count questions created by this user
    const createdResult = await db
      .select({ total: count() })
      .from(questionTable)
      .where(eq(questionTable.createdBy, ctx.auth.userId))

    const questionsCreated = createdResult[0]?.total ?? 0

    return {
      openQuestions,
      myPredictionCount,
      resolvedPredictionCount,
      questionsCreated,
    }
  }),
})
