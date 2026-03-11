import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'

import type { AuthInfo } from '../../src/middleware/auth.middleware.ts'

// ─── Mock dependencies ──────────────────────────────────────────────

const mockDbExecute = vi.fn()
const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockDbInsert = vi.fn()

const insertChain: Record<string, vi.Mock> = {}
insertChain.insert = vi.fn().mockReturnValue(insertChain)
insertChain.values = vi.fn().mockReturnValue(insertChain)
insertChain.returning = vi.fn().mockReturnValue(insertChain)
insertChain.then = vi.fn().mockImplementation((resolve) => resolve(mockDbInsert()))

vi.mock('../../src/db/drizzle.ts', () => ({
  db: {
    insert: (...args: unknown[]) => {
      insertChain.insert(...args)
      return insertChain
    },
    execute: (...args: unknown[]) => mockDbExecute(...args),
    query: {
      questionTable: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
      predictionTable: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
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

const mockLogActivity = vi.fn().mockResolvedValue(undefined)
vi.mock('../../src/services/activity.service.ts', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}))

const mockCanViewQuestion = vi.fn()
vi.mock('../../src/services/rbac.service.ts', () => ({
  canViewQuestion: (...args: unknown[]) => mockCanViewQuestion(...args),
}))

const mockComputeBrierScore = vi.fn()
vi.mock('../../src/services/scoring.service.ts', () => ({
  computeBrierScore: (...args: unknown[]) => mockComputeBrierScore(...args),
}))

vi.mock('../../src/utils/cfg.ts', () => ({
  default: {
    sts: { issuer_uri: 'http://localhost:8080/realms/pki' },
    accessControl: { admins: ['admin@example.com'], defaultRole: 'analyst' },
  },
}))

// ─── Import router + create caller ──────────────────────────────────

import { predictionRouter } from '../../src/trpc/routers/prediction.router.ts'
import { router } from '../../src/trpc/trpc-init.ts'

const testRouter = router({ prediction: predictionRouter })

function createCaller(auth: AuthInfo) {
  return testRouter.createCaller({ auth })
}

// ─── Test Helpers ───────────────────────────────────────────────────

function makeAuth(
  overrides: Partial<AuthInfo> & { role: AuthInfo['role'] },
): AuthInfo {
  return {
    userId: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides,
  }
}

const adminAuth = makeAuth({ userId: 'admin-1', email: 'admin@example.com', role: 'admin' })
const moderatorAuth = makeAuth({ userId: 'mod-1', role: 'moderator' })
const analystAuth = makeAuth({ userId: 'analyst-1', role: 'analyst' })

const openQuestion = {
  id: 'q-1',
  title: 'Will X happen?',
  description: 'Description',
  category: 'geopolitics',
  resolutionCriteria: 'If X occurs by deadline',
  deadline: new Date('2026-06-01'),
  status: 'open' as const,
  resolutionNotes: null,
  resolvedAt: null,
  resolvedBy: null,
  createdBy: 'other-user',
  teamId: null,
  tags: ['intel'],
  externalRef: null,
  visibility: 'public' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const resolvedYesQuestion = {
  ...openQuestion,
  status: 'resolved_yes' as const,
  resolvedAt: new Date('2026-03-01'),
  resolvedBy: 'mod-1',
}

const resolvedNoQuestion = {
  ...openQuestion,
  status: 'resolved_no' as const,
  resolvedAt: new Date('2026-03-01'),
  resolvedBy: 'mod-1',
}

const questionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── submit ─────────────────────────────────────────────────────────

describe('prediction.submit', () => {
  it('submits a prediction with valid probability', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    const newPrediction = {
      id: 'p-1',
      questionId,
      userId: 'analyst-1',
      probability: '0.7500',
      reasoning: 'My analysis',
      createdAt: new Date(),
    }
    mockDbInsert.mockReturnValue([newPrediction])

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.submit({
      questionId,
      probability: 75,
      reasoning: 'My analysis',
    })

    expect(result).toEqual(newPrediction)
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId,
        userId: 'analyst-1',
        probability: '0.7500',
        reasoning: 'My analysis',
      }),
    )
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'prediction_submitted',
        actorId: 'analyst-1',
      }),
    )
  })

  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 50,
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Question not found',
    })
  })

  it('throws BAD_REQUEST when question is not open', async () => {
    mockFindFirst.mockResolvedValue(resolvedYesQuestion)
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 50,
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Predictions can only be submitted for open questions',
    })
  })

  it('throws BAD_REQUEST for cancelled questions', async () => {
    mockFindFirst.mockResolvedValue({
      ...openQuestion,
      status: 'cancelled',
    })
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 50,
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('throws FORBIDDEN when user cannot view the question', async () => {
    mockFindFirst.mockResolvedValue({
      ...openQuestion,
      visibility: 'private',
      createdBy: 'other-user',
    })
    mockCanViewQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 50,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('converts integer percentage to decimal (75 -> 0.7500)', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockDbInsert.mockReturnValue([{ id: 'p-1' }])

    const caller = createCaller(analystAuth)
    await caller.prediction.submit({
      questionId,
      probability: 75,
    })

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ probability: '0.7500' }),
    )
  })

  it('converts boundary probability 1 -> 0.0100', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockDbInsert.mockReturnValue([{ id: 'p-1' }])

    const caller = createCaller(analystAuth)
    await caller.prediction.submit({
      questionId,
      probability: 1,
    })

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ probability: '0.0100' }),
    )
  })

  it('converts boundary probability 99 -> 0.9900', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockDbInsert.mockReturnValue([{ id: 'p-1' }])

    const caller = createCaller(analystAuth)
    await caller.prediction.submit({
      questionId,
      probability: 99,
    })

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ probability: '0.9900' }),
    )
  })

  it('rejects unauthenticated calls', async () => {
    const unauthCaller = testRouter.createCaller({ auth: undefined })

    await expect(
      unauthCaller.prediction.submit({
        questionId,
        probability: 50,
      }),
    ).rejects.toThrow(TRPCError)
  })
})

describe('prediction.submit input validation', () => {
  it('rejects probability below 1', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 0,
      }),
    ).rejects.toThrow()
  })

  it('rejects probability above 99', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 100,
      }),
    ).rejects.toThrow()
  })

  it('rejects non-integer probability', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId,
        probability: 50.5,
      }),
    ).rejects.toThrow()
  })

  it('rejects non-uuid questionId', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.submit({
        questionId: 'not-a-uuid',
        probability: 50,
      }),
    ).rejects.toThrow()
  })
})

// ─── listByQuestion ─────────────────────────────────────────────────

describe('prediction.listByQuestion', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.listByQuestion({ questionId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws FORBIDDEN when user cannot view the question', async () => {
    mockFindFirst.mockResolvedValue({
      ...openQuestion,
      visibility: 'private',
      createdBy: 'other-user',
    })
    mockCanViewQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.listByQuestion({ questionId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  describe('pre-resolution (open question)', () => {
    it('returns own predictions and aggregate stats for open questions', async () => {
      mockFindFirst.mockResolvedValue(openQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      const myPredictions = [
        { id: 'p-1', probability: '0.7000', createdAt: new Date('2026-02-01') },
        { id: 'p-2', probability: '0.8000', createdAt: new Date('2026-01-01') },
      ]
      mockFindMany.mockResolvedValue(myPredictions)

      mockDbExecute.mockResolvedValue({
        rows: [{ count: '5', mean: '0.65', median: '0.70' }],
      })

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      expect(result.status).toBe('open')
      if (result.status === 'open') {
        expect(result.myPredictions).toEqual(myPredictions)
        expect(result.aggregate.count).toBe(5)
        expect(result.aggregate.mean).toBe(0.65)
        expect(result.aggregate.median).toBe(0.7)
      }
    })

    it('returns zero aggregate stats when no predictions exist', async () => {
      mockFindFirst.mockResolvedValue(openQuestion)
      mockCanViewQuestion.mockResolvedValue(true)
      mockFindMany.mockResolvedValue([])
      mockDbExecute.mockResolvedValue({
        rows: [{ count: '0', mean: null, median: null }],
      })

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      expect(result.status).toBe('open')
      if (result.status === 'open') {
        expect(result.myPredictions).toEqual([])
        expect(result.aggregate.count).toBe(0)
        expect(result.aggregate.mean).toBeNull()
        expect(result.aggregate.median).toBeNull()
      }
    })

    it('does not reveal other users predictions before resolution', async () => {
      mockFindFirst.mockResolvedValue(openQuestion)
      mockCanViewQuestion.mockResolvedValue(true)
      mockFindMany.mockResolvedValue([])
      mockDbExecute.mockResolvedValue({
        rows: [{ count: '10', mean: '0.55', median: '0.50' }],
      })

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      // Should have aggregate stats but no individual predictions from others
      expect(result.status).toBe('open')
      if (result.status === 'open') {
        expect(result.aggregate.count).toBe(10)
        // No 'predictions' array with other users' data
        expect((result as Record<string, unknown>)['predictions']).toBeUndefined()
      }
    })
  })

  describe('post-resolution (resolved question)', () => {
    it('returns all predictions with Brier scores for resolved_yes', async () => {
      mockFindFirst.mockResolvedValue(resolvedYesQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      mockDbExecute.mockResolvedValue({
        rows: [
          {
            id: 'p-1',
            question_id: questionId,
            user_id: 'u-1',
            probability: '0.8000',
            reasoning: 'Analysis A',
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Alice',
            email: 'alice@example.com',
          },
          {
            id: 'p-2',
            question_id: questionId,
            user_id: 'u-2',
            probability: '0.3000',
            reasoning: 'Analysis B',
            created_at: '2026-02-02T00:00:00Z',
            display_name: 'Bob',
            email: 'bob@example.com',
          },
        ],
      })

      // Mock Brier scores: lower is better for resolved_yes with high probability
      mockComputeBrierScore
        .mockReturnValueOnce(0.04) // 0.80 on yes -> good
        .mockReturnValueOnce(0.49) // 0.30 on yes -> bad

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      expect(result.status).toBe('resolved')
      if (result.status === 'resolved') {
        expect(result.predictions).toHaveLength(2)
        expect(result.outcome).toBe('resolved_yes')

        // Should be sorted by Brier score ascending (best first)
        expect(result.predictions[0]?.brierScore).toBe(0.04)
        expect(result.predictions[0]?.displayName).toBe('Alice')
        expect(result.predictions[1]?.brierScore).toBe(0.49)
        expect(result.predictions[1]?.displayName).toBe('Bob')
      }
    })

    it('returns all predictions for resolved_no with correct Brier scores', async () => {
      mockFindFirst.mockResolvedValue(resolvedNoQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      mockDbExecute.mockResolvedValue({
        rows: [
          {
            id: 'p-1',
            question_id: questionId,
            user_id: 'u-1',
            probability: '0.2000',
            reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Alice',
            email: 'alice@example.com',
          },
        ],
      })

      mockComputeBrierScore.mockReturnValue(0.04) // 0.20 on no -> good

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      expect(result.status).toBe('resolved')
      if (result.status === 'resolved') {
        expect(result.outcome).toBe('resolved_no')
        expect(result.predictions[0]?.brierScore).toBe(0.04)
      }
    })

    it('handles ambiguous outcome with null Brier scores', async () => {
      const ambiguousQuestion = {
        ...openQuestion,
        status: 'ambiguous' as const,
        resolvedAt: new Date('2026-03-01'),
      }
      mockFindFirst.mockResolvedValue(ambiguousQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      mockDbExecute.mockResolvedValue({
        rows: [
          {
            id: 'p-1',
            question_id: questionId,
            user_id: 'u-1',
            probability: '0.5000',
            reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Alice',
            email: 'alice@example.com',
          },
        ],
      })

      mockComputeBrierScore.mockReturnValue(null)

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      expect(result.status).toBe('resolved')
      if (result.status === 'resolved') {
        expect(result.outcome).toBe('ambiguous')
        expect(result.predictions[0]?.brierScore).toBeNull()
      }
    })

    it('sorts predictions by Brier score ascending (best first)', async () => {
      mockFindFirst.mockResolvedValue(resolvedYesQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      mockDbExecute.mockResolvedValue({
        rows: [
          {
            id: 'p-1', question_id: questionId, user_id: 'u-1',
            probability: '0.5000', reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Charlie', email: 'c@example.com',
          },
          {
            id: 'p-2', question_id: questionId, user_id: 'u-2',
            probability: '0.9000', reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Alice', email: 'a@example.com',
          },
          {
            id: 'p-3', question_id: questionId, user_id: 'u-3',
            probability: '0.1000', reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Bob', email: 'b@example.com',
          },
        ],
      })

      mockComputeBrierScore
        .mockReturnValueOnce(0.25) // Charlie: 0.50 on yes
        .mockReturnValueOnce(0.01) // Alice: 0.90 on yes -> best
        .mockReturnValueOnce(0.81) // Bob: 0.10 on yes -> worst

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      if (result.status === 'resolved') {
        expect(result.predictions[0]?.displayName).toBe('Alice')
        expect(result.predictions[1]?.displayName).toBe('Charlie')
        expect(result.predictions[2]?.displayName).toBe('Bob')
      }
    })

    it('sorts null Brier scores to the end', async () => {
      mockFindFirst.mockResolvedValue(resolvedYesQuestion)
      mockCanViewQuestion.mockResolvedValue(true)

      mockDbExecute.mockResolvedValue({
        rows: [
          {
            id: 'p-1', question_id: questionId, user_id: 'u-1',
            probability: '0.8000', reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Alice', email: 'a@example.com',
          },
          {
            id: 'p-2', question_id: questionId, user_id: 'u-2',
            probability: '0.5000', reasoning: null,
            created_at: '2026-02-01T00:00:00Z',
            display_name: 'Bob', email: 'b@example.com',
          },
        ],
      })

      mockComputeBrierScore
        .mockReturnValueOnce(0.04) // Alice: scored
        .mockReturnValueOnce(null) // Bob: null score

      const caller = createCaller(analystAuth)
      const result = await caller.prediction.listByQuestion({ questionId })

      if (result.status === 'resolved') {
        expect(result.predictions[0]?.displayName).toBe('Alice')
        expect(result.predictions[0]?.brierScore).toBe(0.04)
        expect(result.predictions[1]?.displayName).toBe('Bob')
        expect(result.predictions[1]?.brierScore).toBeNull()
      }
    })
  })
})

// ─── myHistory ──────────────────────────────────────────────────────

describe('prediction.myHistory', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.myHistory({ questionId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws FORBIDDEN when user cannot view the question', async () => {
    mockFindFirst.mockResolvedValue({
      ...openQuestion,
      visibility: 'private',
      createdBy: 'other-user',
    })
    mockCanViewQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.myHistory({ questionId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns all revisions ordered by createdAt ascending', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)

    const predictions = [
      { id: 'p-1', probability: '0.5000', createdAt: new Date('2026-01-01') },
      { id: 'p-2', probability: '0.6000', createdAt: new Date('2026-01-15') },
      { id: 'p-3', probability: '0.7500', createdAt: new Date('2026-02-01') },
    ]
    mockFindMany.mockResolvedValue(predictions)

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.myHistory({ questionId })

    expect(result).toHaveLength(3)
    expect(result[0]?.id).toBe('p-1')
    expect(result[1]?.id).toBe('p-2')
    expect(result[2]?.id).toBe('p-3')
  })

  it('returns empty array when user has no predictions on the question', async () => {
    mockFindFirst.mockResolvedValue(openQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockFindMany.mockResolvedValue([])

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.myHistory({ questionId })

    expect(result).toEqual([])
  })
})

// ─── myPredictions ──────────────────────────────────────────────────

describe('prediction.myPredictions', () => {
  it('returns paginated predictions with question info', async () => {
    mockDbExecute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'p-1',
            question_id: 'q-1',
            probability: '0.8000',
            reasoning: 'Analysis',
            created_at: '2026-02-01T00:00:00Z',
            title: 'Will X happen?',
            status: 'open',
            deadline: '2026-06-01',
            category: 'geopolitics',
            resolved_at: null,
          },
          {
            id: 'p-2',
            question_id: 'q-2',
            probability: '0.6000',
            reasoning: null,
            created_at: '2026-01-15T00:00:00Z',
            title: 'Will Y happen?',
            status: 'resolved_yes',
            deadline: '2026-03-01',
            category: 'economics',
            resolved_at: '2026-03-01T00:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ total: '5' }],
      })

    // Brier score only for resolved_yes
    mockComputeBrierScore.mockReturnValue(0.04)

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.myPredictions({
      page: 1,
      pageSize: 20,
    })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(5)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)

    // First item: open question - no Brier score
    expect(result.items[0]?.question.title).toBe('Will X happen?')
    expect(result.items[0]?.brierScore).toBeNull()

    // Second item: resolved_yes - has Brier score
    expect(result.items[1]?.question.title).toBe('Will Y happen?')
    expect(result.items[1]?.brierScore).toBe(0.04)
  })

  it('returns empty when user has no predictions', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.myPredictions({
      page: 1,
      pageSize: 20,
    })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  it('computes Brier score only for resolved_yes and resolved_no', async () => {
    mockDbExecute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'p-1', question_id: 'q-1', probability: '0.7000',
            reasoning: null, created_at: '2026-02-01T00:00:00Z',
            title: 'Q1', status: 'resolved_yes', deadline: '2026-06-01',
            category: null, resolved_at: '2026-03-01T00:00:00Z',
          },
          {
            id: 'p-2', question_id: 'q-2', probability: '0.3000',
            reasoning: null, created_at: '2026-02-01T00:00:00Z',
            title: 'Q2', status: 'resolved_no', deadline: '2026-06-01',
            category: null, resolved_at: '2026-03-01T00:00:00Z',
          },
          {
            id: 'p-3', question_id: 'q-3', probability: '0.5000',
            reasoning: null, created_at: '2026-02-01T00:00:00Z',
            title: 'Q3', status: 'ambiguous', deadline: '2026-06-01',
            category: null, resolved_at: '2026-03-01T00:00:00Z',
          },
          {
            id: 'p-4', question_id: 'q-4', probability: '0.5000',
            reasoning: null, created_at: '2026-02-01T00:00:00Z',
            title: 'Q4', status: 'open', deadline: '2026-06-01',
            category: null, resolved_at: null,
          },
          {
            id: 'p-5', question_id: 'q-5', probability: '0.5000',
            reasoning: null, created_at: '2026-02-01T00:00:00Z',
            title: 'Q5', status: 'cancelled', deadline: '2026-06-01',
            category: null, resolved_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '5' }] })

    mockComputeBrierScore
      .mockReturnValueOnce(0.09) // resolved_yes
      .mockReturnValueOnce(0.09) // resolved_no

    const caller = createCaller(analystAuth)
    const result = await caller.prediction.myPredictions({
      page: 1,
      pageSize: 20,
    })

    // resolved_yes and resolved_no get Brier scores
    expect(result.items[0]?.brierScore).toBe(0.09)
    expect(result.items[1]?.brierScore).toBe(0.09)
    // ambiguous, open, cancelled get null
    expect(result.items[2]?.brierScore).toBeNull()
    expect(result.items[3]?.brierScore).toBeNull()
    expect(result.items[4]?.brierScore).toBeNull()

    // computeBrierScore only called for resolved_yes and resolved_no
    expect(mockComputeBrierScore).toHaveBeenCalledTimes(2)
  })

  it('handles pagination offset correctly', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })

    const caller = createCaller(analystAuth)
    await caller.prediction.myPredictions({
      page: 3,
      pageSize: 10,
    })

    // The SQL template includes OFFSET, check execute was called
    expect(mockDbExecute).toHaveBeenCalled()
  })

  it('rejects unauthenticated calls', async () => {
    const unauthCaller = testRouter.createCaller({ auth: undefined })

    await expect(
      unauthCaller.prediction.myPredictions({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow(TRPCError)
  })
})

// ─── Input validation ───────────────────────────────────────────────

describe('prediction input validation', () => {
  it('rejects non-uuid questionId in myHistory', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.myHistory({ questionId: 'not-a-uuid' }),
    ).rejects.toThrow()
  })

  it('rejects page < 1 in myPredictions', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.myPredictions({ page: 0, pageSize: 20 }),
    ).rejects.toThrow()
  })

  it('rejects pageSize > 100 in myPredictions', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.prediction.myPredictions({ page: 1, pageSize: 101 }),
    ).rejects.toThrow()
  })
})
