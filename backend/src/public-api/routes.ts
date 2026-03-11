import { Router } from 'express'
import type { Request, Response } from 'express'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../db/drizzle.ts'
import {
  questionTable,
  calibrationScoreTable,
} from '../drizzle/schema.ts'
import { validatePublicApiToken } from './auth.ts'
import type { PublicApiAuth } from './auth.ts'
import { logger } from '../logger.ts'

// ─── Validation Schemas ─────────────────────────────────────────────

const CreateQuestionSchema = z.object({
  title: z.string().min(1).max(500),
  resolution_criteria: z.string().min(1).max(2000),
  deadline: z.string().datetime(),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  external_ref: z
    .object({
      source: z.string(),
      id: z.string(),
      url: z.string().url().optional(),
    })
    .optional(),
  visibility: z.enum(['public', 'team', 'private']).optional(),
  team_id: z.string().uuid().optional(),
})

// ─── Helpers ────────────────────────────────────────────────────────

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  res.status(status).json({ error: { code, message } })
}

function requireAuth(
  auth: PublicApiAuth | null,
  res: Response,
): auth is PublicApiAuth {
  if (!auth) {
    sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid Bearer token')
    return false
  }
  return true
}

function getCurrentQuarter(): string {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return `${year.toString()}-Q${quarter.toString()}`
}

// ─── Router ─────────────────────────────────────────────────────────

export const publicApiRouter = Router()

/**
 * POST /questions
 * Create a question from an external source (e.g. SIGNET).
 */
publicApiRouter.post(
  '/questions',
  async (req: Request, res: Response) => {
    const auth = await validatePublicApiToken(req)
    if (!requireAuth(auth, res)) return

    // Only service tokens or admin users can create via public API
    if (auth.type === 'user' && auth.role !== 'admin') {
      sendError(
        res,
        403,
        'FORBIDDEN',
        'Only service accounts or admins can create questions via public API',
      )
      return
    }

    const parsed = CreateQuestionSchema.safeParse(req.body)
    if (!parsed.success) {
      sendError(res, 400, 'VALIDATION_ERROR', parsed.error.message)
      return
    }

    const input = parsed.data

    // Validate team visibility constraint
    if (input.visibility === 'team' && !input.team_id) {
      sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'team_id is required when visibility is "team"',
      )
      return
    }

    try {
      const createdBy = auth.type === 'user' && auth.userId
        ? auth.userId
        : '00000000-0000-0000-0000-000000000000' // system user for service tokens

      const [inserted] = await db
        .insert(questionTable)
        .values({
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          resolutionCriteria: input.resolution_criteria,
          deadline: new Date(input.deadline),
          status: 'open',
          createdBy,
          teamId: input.team_id ?? null,
          tags: input.tags ?? null,
          externalRef: input.external_ref ?? null,
          visibility: input.visibility ?? 'public',
        })
        .returning({ id: questionTable.id })

      logger.info('Question created via public API', {
        questionId: inserted!.id,
        authType: auth.type,
        externalRef: input.external_ref,
      })

      res.status(201).json({ id: inserted!.id, status: 'open' })
    } catch (err) {
      logger.error('Failed to create question via public API', {
        error: (err as Error).message,
      })
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create question')
    }
  },
)

/**
 * GET /users/:id/calibration
 * Return calibration summary for a user.
 * Auth: admin sees any, service tokens see any, others see own only.
 */
publicApiRouter.get(
  '/users/:id/calibration',
  async (req: Request, res: Response) => {
    const auth = await validatePublicApiToken(req)
    if (!requireAuth(auth, res)) return

    const targetUserId = req.params.id as string

    // Authorization: service tokens and admins see any user; others see only own
    if (auth.type === 'user') {
      const isAdmin = auth.role === 'admin'
      const isOwn = auth.userId === targetUserId
      if (!isAdmin && !isOwn) {
        sendError(
          res,
          403,
          'FORBIDDEN',
          'You can only view your own calibration data',
        )
        return
      }
    }

    try {
      // Fetch all-time calibration
      const allTimeScore = await db.query.calibrationScoreTable.findFirst({
        where: and(
          eq(calibrationScoreTable.userId, targetUserId),
          eq(calibrationScoreTable.period, 'all-time'),
        ),
      })

      // Fetch current quarter calibration
      const currentQuarter = getCurrentQuarter()
      const quarterScore = await db.query.calibrationScoreTable.findFirst({
        where: and(
          eq(calibrationScoreTable.userId, targetUserId),
          eq(calibrationScoreTable.period, currentQuarter),
        ),
      })

      const formatScore = (
        score: typeof allTimeScore,
      ): {
        brier_score: number | null
        total_predictions: number
        resolved_predictions: number
      } => ({
        brier_score: score?.brierScore
          ? Number(score.brierScore)
          : null,
        total_predictions: score?.totalPredictions ?? 0,
        resolved_predictions: score?.resolvedPredictions ?? 0,
      })

      res.status(200).json({
        user_id: targetUserId,
        all_time: formatScore(allTimeScore),
        recent_quarter: formatScore(quarterScore),
      })
    } catch (err) {
      logger.error('Failed to fetch calibration data via public API', {
        error: (err as Error).message,
        targetUserId,
      })
      sendError(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to fetch calibration data',
      )
    }
  },
)
