import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../db/drizzle.ts'
import {
  calibrationScoreTable,
  predictionTable,
  questionTable,
} from '../drizzle/schema.ts'
import type { AccuracyBuckets } from '../drizzle/schema.ts'
import { logger } from '../logger.ts'

/**
 * Compute Brier score: (probability - outcome)^2
 * outcome: 1 for resolved_yes, 0 for resolved_no
 * Returns null for ambiguous/cancelled questions
 */
export function computeBrierScore(
  probability: number,
  outcome: 'resolved_yes' | 'resolved_no' | 'ambiguous' | 'cancelled',
): number | null {
  if (outcome === 'ambiguous' || outcome === 'cancelled') return null
  const o = outcome === 'resolved_yes' ? 1 : 0
  return Math.pow(probability - o, 2)
}

/**
 * Compute calibration buckets from a set of scored predictions.
 * Groups predictions into 10% buckets and calculates actual outcome rate per bucket.
 */
export function computeCalibrationBuckets(
  predictions: Array<{ probability: number; outcome: boolean }>,
): AccuracyBuckets {
  const buckets: AccuracyBuckets = {}
  for (let i = 0; i < 10; i++) {
    const key = `${(i * 10).toString()}-${((i + 1) * 10).toString()}`
    buckets[key] = { predicted: 0, actual: 0 }
  }
  for (const p of predictions) {
    const bucketIndex = Math.min(Math.floor(p.probability * 10), 9)
    const key = `${(bucketIndex * 10).toString()}-${((bucketIndex + 1) * 10).toString()}`
    const bucket = buckets[key]
    if (bucket) {
      bucket.predicted++
      if (p.outcome) bucket.actual++
    }
  }
  return buckets
}

function getCurrentPeriods(): string[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  return [
    `${year.toString()}-${month}`,
    `${year.toString()}-Q${quarter.toString()}`,
    'all-time',
  ]
}

/**
 * Recompute calibration scores for a user across canonical periods.
 * Idempotent: UPSERTs on (user_id, period) unique constraint.
 */
export async function recomputeUserCalibration(
  userId: string,
): Promise<void> {
  // Get all resolved questions where this user has predictions
  const userPredictions = await db
    .select({
      predictionId: predictionTable.id,
      questionId: predictionTable.questionId,
      probability: predictionTable.probability,
      predCreatedAt: predictionTable.createdAt,
      questionStatus: questionTable.status,
      questionResolvedAt: questionTable.resolvedAt,
    })
    .from(predictionTable)
    .innerJoin(questionTable, eq(predictionTable.questionId, questionTable.id))
    .where(
      and(
        eq(predictionTable.userId, userId),
        inArray(questionTable.status, ['resolved_yes', 'resolved_no']),
      ),
    )
    .orderBy(desc(predictionTable.createdAt))

  // Get latest prediction per question
  const latestByQuestion = new Map<
    string,
    {
      probability: number
      outcome: boolean
      resolvedAt: Date | null
    }
  >()

  for (const pred of userPredictions) {
    if (!latestByQuestion.has(pred.questionId)) {
      latestByQuestion.set(pred.questionId, {
        probability: Number(pred.probability),
        outcome: pred.questionStatus === 'resolved_yes',
        resolvedAt: pred.questionResolvedAt,
      })
    }
  }

  const allPredictions = Array.from(latestByQuestion.values())
  const periods = getCurrentPeriods()

  for (const period of periods) {
    let filteredPredictions = allPredictions

    if (period !== 'all-time') {
      const now = new Date()
      let startDate: Date

      if (period.includes('Q')) {
        const [yearStr, qStr] = period.split('-Q')
        const quarter = Number(qStr)
        startDate = new Date(Number(yearStr), (quarter - 1) * 3, 1)
      } else {
        const [yearStr, monthStr] = period.split('-')
        startDate = new Date(Number(yearStr), Number(monthStr) - 1, 1)
      }

      filteredPredictions = allPredictions.filter(
        (p) =>
          p.resolvedAt && p.resolvedAt >= startDate && p.resolvedAt <= now,
      )
    }

    // Compute stats
    const resolvedCount = filteredPredictions.length
    const totalCount = resolvedCount // For now, only counting resolved

    let brierSum = 0
    const scoredPredictions: Array<{
      probability: number
      outcome: boolean
    }> = []

    for (const p of filteredPredictions) {
      const score = computeBrierScore(
        p.probability,
        p.outcome ? 'resolved_yes' : 'resolved_no',
      )
      if (score !== null) {
        brierSum += score
        scoredPredictions.push({
          probability: p.probability,
          outcome: p.outcome,
        })
      }
    }

    const meanBrier =
      scoredPredictions.length > 0 ? brierSum / scoredPredictions.length : null
    const buckets = computeCalibrationBuckets(scoredPredictions)

    // UPSERT
    await db
      .insert(calibrationScoreTable)
      .values({
        userId,
        period,
        brierScore: meanBrier?.toFixed(6) ?? null,
        totalPredictions: totalCount,
        resolvedPredictions: resolvedCount,
        accuracyBuckets: buckets,
      })
      .onConflictDoUpdate({
        target: [calibrationScoreTable.userId, calibrationScoreTable.period],
        set: {
          brierScore: sql`EXCLUDED.brier_score`,
          totalPredictions: sql`EXCLUDED.total_predictions`,
          resolvedPredictions: sql`EXCLUDED.resolved_predictions`,
          accuracyBuckets: sql`EXCLUDED.accuracy_buckets`,
          computedAt: sql`NOW()`,
        },
      })
  }
}

/**
 * Recompute calibration for all users with resolved predictions.
 */
export async function recomputeAllCalibration(): Promise<{ count: number }> {
  const users = await db
    .selectDistinct({ userId: predictionTable.userId })
    .from(predictionTable)
    .innerJoin(questionTable, eq(predictionTable.questionId, questionTable.id))
    .where(inArray(questionTable.status, ['resolved_yes', 'resolved_no']))

  let count = 0
  for (const { userId } of users) {
    try {
      await recomputeUserCalibration(userId)
      count++
    } catch (err) {
      logger.error('Failed to recompute calibration for user', {
        userId,
        error: (err as Error).message,
      })
    }
  }

  return { count }
}
