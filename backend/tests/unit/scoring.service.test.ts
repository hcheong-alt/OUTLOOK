import { describe, it, expect, vi } from 'vitest'

// ─── Mock the database and logger to avoid config/connection loading ─

vi.mock('../../src/db/drizzle.ts', () => ({
  db: {},
}))

vi.mock('../../src/logger.ts', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}))

import {
  computeBrierScore,
  computeCalibrationBuckets,
} from '../../src/services/scoring.service.ts'

// ─── computeBrierScore ──────────────────────────────────────────────

describe('computeBrierScore', () => {
  describe('resolved_yes outcome', () => {
    it('returns 0 for a perfect prediction (100% on resolved_yes)', () => {
      expect(computeBrierScore(1, 'resolved_yes')).toBe(0)
    })

    it('returns 1 for the worst prediction (0% on resolved_yes)', () => {
      expect(computeBrierScore(0, 'resolved_yes')).toBe(1)
    })

    it('returns 0.25 for a 50% prediction on resolved_yes', () => {
      expect(computeBrierScore(0.5, 'resolved_yes')).toBe(0.25)
    })

    it('returns correct score for a 70% prediction on resolved_yes', () => {
      const score = computeBrierScore(0.7, 'resolved_yes')
      expect(score).toBeCloseTo(0.09, 5)
    })

    it('returns correct score for a 20% prediction on resolved_yes', () => {
      const score = computeBrierScore(0.2, 'resolved_yes')
      expect(score).toBeCloseTo(0.64, 5)
    })
  })

  describe('resolved_no outcome', () => {
    it('returns 0 for a perfect prediction (0% on resolved_no)', () => {
      expect(computeBrierScore(0, 'resolved_no')).toBe(0)
    })

    it('returns 1 for the worst prediction (100% on resolved_no)', () => {
      expect(computeBrierScore(1, 'resolved_no')).toBe(1)
    })

    it('returns 0.25 for a 50% prediction on resolved_no', () => {
      expect(computeBrierScore(0.5, 'resolved_no')).toBe(0.25)
    })

    it('returns correct score for a 30% prediction on resolved_no', () => {
      const score = computeBrierScore(0.3, 'resolved_no')
      expect(score).toBeCloseTo(0.09, 5)
    })

    it('returns correct score for a 80% prediction on resolved_no', () => {
      const score = computeBrierScore(0.8, 'resolved_no')
      expect(score).toBeCloseTo(0.64, 5)
    })
  })

  describe('non-scorable outcomes', () => {
    it('returns null for ambiguous outcome', () => {
      expect(computeBrierScore(0.5, 'ambiguous')).toBeNull()
    })

    it('returns null for cancelled outcome', () => {
      expect(computeBrierScore(0.5, 'cancelled')).toBeNull()
    })

    it('returns null for ambiguous even with extreme probability', () => {
      expect(computeBrierScore(1, 'ambiguous')).toBeNull()
      expect(computeBrierScore(0, 'ambiguous')).toBeNull()
    })

    it('returns null for cancelled even with extreme probability', () => {
      expect(computeBrierScore(1, 'cancelled')).toBeNull()
      expect(computeBrierScore(0, 'cancelled')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles probability of exactly 0', () => {
      expect(computeBrierScore(0, 'resolved_yes')).toBe(1)
      expect(computeBrierScore(0, 'resolved_no')).toBe(0)
    })

    it('handles probability of exactly 1', () => {
      expect(computeBrierScore(1, 'resolved_yes')).toBe(0)
      expect(computeBrierScore(1, 'resolved_no')).toBe(1)
    })

    it('handles very small probability', () => {
      const score = computeBrierScore(0.01, 'resolved_yes')
      expect(score).toBeCloseTo(0.9801, 4)
    })

    it('handles very large probability close to 1', () => {
      const score = computeBrierScore(0.99, 'resolved_no')
      expect(score).toBeCloseTo(0.9801, 4)
    })

    it('score is symmetric: Brier(p, yes) === Brier(1-p, no)', () => {
      const p = 0.73
      const scoreYes = computeBrierScore(p, 'resolved_yes')
      const scoreNo = computeBrierScore(1 - p, 'resolved_no')
      expect(scoreYes).toBeCloseTo(scoreNo!, 10)
    })
  })
})

// ─── computeCalibrationBuckets ──────────────────────────────────────

describe('computeCalibrationBuckets', () => {
  it('returns 10 empty buckets when given no predictions', () => {
    const buckets = computeCalibrationBuckets([])
    const keys = Object.keys(buckets)
    expect(keys).toHaveLength(10)

    for (const key of keys) {
      expect(buckets[key]).toEqual({ predicted: 0, actual: 0 })
    }
  })

  it('has correct bucket key format (e.g. "0-10", "10-20", ..., "90-100")', () => {
    const buckets = computeCalibrationBuckets([])
    const keys = Object.keys(buckets)
    const expectedKeys = [
      '0-10', '10-20', '20-30', '30-40', '40-50',
      '50-60', '60-70', '70-80', '80-90', '90-100',
    ]
    expect(keys).toEqual(expectedKeys)
  })

  it('places a single prediction in the correct bucket', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 0.35, outcome: true },
    ])
    expect(buckets['30-40']).toEqual({ predicted: 1, actual: 1 })
    // Other buckets remain empty
    expect(buckets['0-10']).toEqual({ predicted: 0, actual: 0 })
    expect(buckets['90-100']).toEqual({ predicted: 0, actual: 0 })
  })

  it('counts false outcomes correctly (predicted but not actual)', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 0.35, outcome: false },
    ])
    expect(buckets['30-40']).toEqual({ predicted: 1, actual: 0 })
  })

  it('groups multiple predictions into the same bucket', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 0.71, outcome: true },
      { probability: 0.75, outcome: false },
      { probability: 0.79, outcome: true },
    ])
    expect(buckets['70-80']).toEqual({ predicted: 3, actual: 2 })
  })

  it('distributes predictions across multiple buckets', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 0.15, outcome: false },
      { probability: 0.45, outcome: true },
      { probability: 0.85, outcome: true },
    ])
    expect(buckets['10-20']).toEqual({ predicted: 1, actual: 0 })
    expect(buckets['40-50']).toEqual({ predicted: 1, actual: 1 })
    expect(buckets['80-90']).toEqual({ predicted: 1, actual: 1 })
  })

  it('handles probability of exactly 1.0 by clamping to the 90-100 bucket', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 1.0, outcome: true },
    ])
    // Math.min(Math.floor(1.0 * 10), 9) = 9 -> "90-100"
    expect(buckets['90-100']).toEqual({ predicted: 1, actual: 1 })
  })

  it('handles probability of exactly 0.0 in the 0-10 bucket', () => {
    const buckets = computeCalibrationBuckets([
      { probability: 0.0, outcome: false },
    ])
    expect(buckets['0-10']).toEqual({ predicted: 1, actual: 0 })
  })

  it('handles boundary probability at bucket edges', () => {
    // 0.1 => floor(0.1 * 10) = 1 => "10-20"
    const buckets = computeCalibrationBuckets([
      { probability: 0.1, outcome: true },
      { probability: 0.2, outcome: false },
      { probability: 0.5, outcome: true },
    ])
    expect(buckets['10-20']).toEqual({ predicted: 1, actual: 1 })
    expect(buckets['20-30']).toEqual({ predicted: 1, actual: 0 })
    expect(buckets['50-60']).toEqual({ predicted: 1, actual: 1 })
  })

  it('handles a large set of predictions across all buckets', () => {
    const predictions = []
    for (let i = 0; i < 10; i++) {
      // Put 3 predictions in each bucket
      const base = i * 0.1
      predictions.push(
        { probability: base + 0.01, outcome: true },
        { probability: base + 0.05, outcome: false },
        { probability: base + 0.09, outcome: true },
      )
    }
    const buckets = computeCalibrationBuckets(predictions)

    for (let i = 0; i < 10; i++) {
      const key = `${(i * 10).toString()}-${((i + 1) * 10).toString()}`
      expect(buckets[key]?.predicted).toBe(3)
      expect(buckets[key]?.actual).toBe(2)
    }
  })

  it('computes correct calibration for a perfectly calibrated set', () => {
    // All predictions at ~80% with 80% true outcome rate
    const predictions = [
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: false },
    ]
    const buckets = computeCalibrationBuckets(predictions)
    expect(buckets['80-90']).toEqual({ predicted: 5, actual: 4 })
  })
})
