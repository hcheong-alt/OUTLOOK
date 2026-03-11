import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/drizzle.ts'
import { commentTable, questionTable } from '../../drizzle/schema.ts'
import { logActivity } from '../../services/activity.service.ts'
import { canViewQuestion } from '../../services/rbac.service.ts'
import { procedure, router } from '../trpc-init.ts'

export const commentRouter = router({
  /**
   * List comments for a question, ordered by createdAt ascending.
   * Includes author info. Requires visibility access to the question.
   */
  listByQuestion: procedure
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

      const comments = await db.query.commentTable.findMany({
        where: eq(commentTable.questionId, input.questionId),
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: {
          author: {
            columns: { id: true, displayName: true, email: true },
          },
        },
      })

      return comments
    }),

  /**
   * Add a comment to a question.
   * Verifies the question exists and the user can view it.
   */
  create: procedure
    .input(
      z.object({
        questionId: z.string().uuid(),
        body: z.string().min(1).max(10000),
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

      const allowed = await canViewQuestion(ctx.auth, question)
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this question',
        })
      }

      const [comment] = await db
        .insert(commentTable)
        .values({
          questionId: input.questionId,
          authorId: ctx.auth.userId,
          body: input.body,
        })
        .returning()

      await logActivity({
        entityType: 'question',
        entityId: input.questionId,
        action: 'comment_added',
        actorId: ctx.auth.userId,
        details: { commentId: comment!.id },
      })

      return comment
    }),
})
