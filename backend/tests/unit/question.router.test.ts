import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'

import type { AuthInfo } from '../../src/middleware/auth.middleware.ts'

// ─── Mock dependencies ──────────────────────────────────────────────

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()
const mockDbExecute = vi.fn()
const mockFindFirst = vi.fn()

// Chainable query builder helpers
const makeChain = (terminal: vi.Mock) => {
  const chain: Record<string, vi.Mock> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  chain.leftJoin = vi.fn().mockReturnValue(chain)
  chain.innerJoin = vi.fn().mockReturnValue(chain)
  chain.where = vi.fn().mockReturnValue(chain)
  chain.orderBy = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.offset = vi.fn().mockReturnValue(chain)
  chain.returning = vi.fn().mockReturnValue(chain)
  chain.values = vi.fn().mockReturnValue(chain)
  chain.set = vi.fn().mockReturnValue(chain)
  chain.then = vi.fn().mockImplementation((resolve) => resolve(terminal()))
  return chain
}

const selectChain = makeChain(mockDbSelect)
const insertChain = makeChain(mockDbInsert)
const updateChain = makeChain(mockDbUpdate)
const deleteChain = makeChain(mockDbDelete)

vi.mock('../../src/db/drizzle.ts', () => ({
  db: {
    select: () => selectChain,
    insert: () => insertChain,
    update: () => updateChain,
    delete: () => deleteChain,
    execute: (...args: unknown[]) => mockDbExecute(...args),
    selectDistinct: () => selectChain,
    query: {
      questionTable: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
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
const mockCanEditQuestion = vi.fn()
const mockCanCancelQuestion = vi.fn()
const mockGetUserTeamIds = vi.fn()

vi.mock('../../src/services/rbac.service.ts', () => ({
  canViewQuestion: (...args: unknown[]) => mockCanViewQuestion(...args),
  canEditQuestion: (...args: unknown[]) => mockCanEditQuestion(...args),
  canCancelQuestion: (...args: unknown[]) => mockCanCancelQuestion(...args),
  getUserTeamIds: (...args: unknown[]) => mockGetUserTeamIds(...args),
}))

const mockRecomputeUserCalibration = vi.fn().mockResolvedValue(undefined)
vi.mock('../../src/services/scoring.service.ts', () => ({
  recomputeUserCalibration: (...args: unknown[]) =>
    mockRecomputeUserCalibration(...args),
}))

// Mock config (required by trpc-init -> auth middleware transitive deps)
vi.mock('../../src/utils/cfg.ts', () => ({
  default: {
    sts: { issuer_uri: 'http://localhost:8080/realms/pki' },
    accessControl: { admins: ['admin@example.com'], defaultRole: 'analyst' },
  },
}))

// ─── Import router + create caller ──────────────────────────────────

import { questionRouter } from '../../src/trpc/routers/question.router.ts'
import { router } from '../../src/trpc/trpc-init.ts'

const testRouter = router({ question: questionRouter })

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

const baseQuestion = {
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
  createdBy: 'analyst-1',
  teamId: null,
  tags: ['intel'],
  externalRef: null,
  visibility: 'public' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUserTeamIds.mockResolvedValue([])
})

// ─── list ───────────────────────────────────────────────────────────

describe('question.list', () => {
  it('returns empty list when no questions exist', async () => {
    mockDbSelect.mockReturnValue([])
    mockDbExecute.mockResolvedValue({ rows: [] })

    const caller = createCaller(analystAuth)
    // The list procedure chains .select().from().leftJoin().where().orderBy().limit().offset()
    // The chain returns mockDbSelect() which returns []
    // The total count chain also returns [] -> total 0
    // Override then to return items=[] and total=[{total:0}]
    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve([])
      if (callCount === 2) return resolve([{ total: 0 }])
      return resolve([])
    })

    const result = await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it('computes offset from page and pageSize', async () => {
    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve([])
      if (callCount === 2) return resolve([{ total: 0 }])
      return resolve([])
    })

    const caller = createCaller(analystAuth)
    await caller.question.list({
      page: 3,
      pageSize: 10,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    // offset should be called with (3-1)*10 = 20
    expect(selectChain.offset).toHaveBeenCalledWith(20)
  })

  it('applies status filter when provided', async () => {
    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve([])
      if (callCount === 2) return resolve([{ total: 0 }])
      return resolve([])
    })

    const caller = createCaller(analystAuth)
    await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: { status: 'open' },
    })

    // where should have been called (visibility scoping + status filter)
    expect(selectChain.where).toHaveBeenCalled()
  })

  it('enriches items with prediction stats', async () => {
    const items = [
      { ...baseQuestion, id: 'q-1', creatorName: 'Alice' },
      { ...baseQuestion, id: 'q-2', creatorName: 'Bob' },
    ]

    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve(items)
      if (callCount === 2) return resolve([{ total: 2 }])
      return resolve([])
    })

    mockDbExecute.mockResolvedValue({
      rows: [
        { question_id: 'q-1', probability: '0.70' },
        { question_id: 'q-1', probability: '0.80' },
        { question_id: 'q-2', probability: '0.50' },
      ],
    })

    const caller = createCaller(adminAuth)
    const result = await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    expect(result.items).toHaveLength(2)
    // q-1 has 2 predictions: (0.70+0.80)/2 = 0.75
    const q1 = result.items.find((i) => i.id === 'q-1')
    expect(q1?.predictionCount).toBe(2)
    expect(q1?.consensusProbability).toBe(0.75)

    // q-2 has 1 prediction: 0.50
    const q2 = result.items.find((i) => i.id === 'q-2')
    expect(q2?.predictionCount).toBe(1)
    expect(q2?.consensusProbability).toBe(0.5)
  })

  it('returns null consensus when question has no predictions', async () => {
    const items = [{ ...baseQuestion, id: 'q-1', creatorName: 'Alice' }]

    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve(items)
      if (callCount === 2) return resolve([{ total: 1 }])
      return resolve([])
    })

    mockDbExecute.mockResolvedValue({ rows: [] })

    const caller = createCaller(adminAuth)
    const result = await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    expect(result.items[0]?.consensusProbability).toBeNull()
    expect(result.items[0]?.predictionCount).toBe(0)
  })

  it('calls getUserTeamIds for non-admin users', async () => {
    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve([])
      if (callCount === 2) return resolve([{ total: 0 }])
      return resolve([])
    })

    const caller = createCaller(analystAuth)
    await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    expect(mockGetUserTeamIds).toHaveBeenCalledWith('analyst-1')
  })

  it('does not call getUserTeamIds for admin users', async () => {
    let callCount = 0
    selectChain.then.mockImplementation((resolve: (val: unknown) => void) => {
      callCount++
      if (callCount === 1) return resolve([])
      if (callCount === 2) return resolve([{ total: 0 }])
      return resolve([])
    })

    const caller = createCaller(adminAuth)
    await caller.question.list({
      page: 1,
      pageSize: 20,
      sort: 'createdAt',
      sortDir: 'desc',
      filters: {},
    })

    expect(mockGetUserTeamIds).not.toHaveBeenCalled()
  })
})

// ─── create ─────────────────────────────────────────────────────────

describe('question.create', () => {
  it('creates a question with required fields', async () => {
    const newQuestion = { ...baseQuestion, id: 'q-new' }
    insertChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([newQuestion]),
    )

    const caller = createCaller(analystAuth)
    const result = await caller.question.create({
      title: 'Will X happen?',
      resolutionCriteria: 'If X occurs by deadline',
      deadline: new Date('2026-06-01'),
    })

    expect(result).toEqual(newQuestion)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'question',
        action: 'created',
        actorId: 'analyst-1',
      }),
    )
  })

  it('throws BAD_REQUEST when team visibility lacks teamId', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.create({
        title: 'Team question',
        resolutionCriteria: 'Criteria',
        deadline: new Date('2026-06-01'),
        visibility: 'team',
        // no teamId
      }),
    ).rejects.toThrow(TRPCError)

    await expect(
      caller.question.create({
        title: 'Team question',
        resolutionCriteria: 'Criteria',
        deadline: new Date('2026-06-01'),
        visibility: 'team',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Team visibility requires a teamId',
    })
  })

  it('allows team visibility when teamId is provided', async () => {
    const newQuestion = { ...baseQuestion, visibility: 'team', teamId: 'team-1' }
    insertChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([newQuestion]),
    )

    const caller = createCaller(analystAuth)
    const result = await caller.question.create({
      title: 'Team question',
      resolutionCriteria: 'Criteria',
      deadline: new Date('2026-06-01'),
      visibility: 'team',
      teamId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })

    expect(result).toEqual(newQuestion)
  })

  it('defaults visibility to public', async () => {
    const newQuestion = { ...baseQuestion, visibility: 'public' }
    insertChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([newQuestion]),
    )

    const caller = createCaller(analystAuth)
    await caller.question.create({
      title: 'Public question',
      resolutionCriteria: 'Criteria',
      deadline: new Date('2026-06-01'),
    })

    // The insert values should include visibility: 'public' (default from schema)
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'public' }),
    )
  })

  it('rejects unauthenticated calls', async () => {
    const unauthCaller = testRouter.createCaller({ auth: undefined })

    await expect(
      unauthCaller.question.create({
        title: 'Test',
        resolutionCriteria: 'Test',
        deadline: new Date('2026-06-01'),
      }),
    ).rejects.toThrow(TRPCError)
  })
})

// ─── get ────────────────────────────────────────────────────────────

describe('question.get', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.get({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Question not found',
    })
  })

  it('throws FORBIDDEN when user cannot view the question', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      visibility: 'private',
      createdBy: 'other-user',
    })
    mockCanViewQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.question.get({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('returns question with consensus stats', async () => {
    mockFindFirst.mockResolvedValue(baseQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockDbExecute.mockResolvedValue({
      rows: [
        { user_id: 'u-1', probability: '0.60' },
        { user_id: 'u-2', probability: '0.80' },
      ],
    })

    const caller = createCaller(analystAuth)
    const result = await caller.question.get({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })

    expect(result.predictionCount).toBe(2)
    expect(result.consensusProbability).toBe(0.7)
    // Median of [0.60, 0.80] = (0.60+0.80)/2 = 0.70
    expect(result.consensusMedian).toBe(0.7)
  })

  it('returns null consensus when no predictions exist', async () => {
    mockFindFirst.mockResolvedValue(baseQuestion)
    mockCanViewQuestion.mockResolvedValue(true)
    mockDbExecute.mockResolvedValue({ rows: [] })

    const caller = createCaller(analystAuth)
    const result = await caller.question.get({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })

    expect(result.predictionCount).toBe(0)
    expect(result.consensusProbability).toBeNull()
    expect(result.consensusMedian).toBeNull()
  })
})

// ─── resolve ────────────────────────────────────────────────────────

describe('question.resolve', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(moderatorAuth)

    await expect(
      caller.question.resolve({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        outcome: 'resolved_yes',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws BAD_REQUEST when question is not open', async () => {
    mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'cancelled' })
    const caller = createCaller(moderatorAuth)

    await expect(
      caller.question.resolve({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        outcome: 'resolved_yes',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only open questions can be resolved',
    })
  })

  it('rejects analyst role (requires moderator+)', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.resolve({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        outcome: 'resolved_yes',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('resolves an open question and triggers calibration recompute', async () => {
    mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'open' })
    const resolvedQuestion = {
      ...baseQuestion,
      status: 'resolved_yes',
      resolvedAt: new Date(),
      resolvedBy: 'mod-1',
    }
    updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([resolvedQuestion]),
    )
    mockDbExecute.mockResolvedValue({
      rows: [
        { user_id: 'u-1', probability: '0.80' },
        { user_id: 'u-2', probability: '0.60' },
      ],
    })

    const caller = createCaller(moderatorAuth)
    const result = await caller.question.resolve({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      outcome: 'resolved_yes',
      resolutionNotes: 'X did happen',
    })

    expect(result).toEqual(resolvedQuestion)
    // Should recompute calibration for both affected users
    expect(mockRecomputeUserCalibration).toHaveBeenCalledWith('u-1')
    expect(mockRecomputeUserCalibration).toHaveBeenCalledWith('u-2')
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'resolved',
        details: expect.objectContaining({ outcome: 'resolved_yes' }),
      }),
    )
  })

  it('does not recompute calibration for ambiguous outcome', async () => {
    mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'open' })
    const resolvedQuestion = {
      ...baseQuestion,
      status: 'ambiguous',
      resolvedAt: new Date(),
    }
    updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([resolvedQuestion]),
    )

    const caller = createCaller(moderatorAuth)
    await caller.question.resolve({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      outcome: 'ambiguous',
    })

    expect(mockRecomputeUserCalibration).not.toHaveBeenCalled()
  })

  it('accepts valid outcome values', async () => {
    for (const outcome of ['resolved_yes', 'resolved_no', 'ambiguous'] as const) {
      vi.clearAllMocks()
      mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'open' })
      updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
        resolve([{ ...baseQuestion, status: outcome }]),
      )
      if (outcome !== 'ambiguous') {
        mockDbExecute.mockResolvedValue({ rows: [] })
      }

      const caller = createCaller(moderatorAuth)
      const result = await caller.question.resolve({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        outcome,
      })
      expect(result?.status).toBe(outcome)
    }
  })
})

// ─── cancel ─────────────────────────────────────────────────────────

describe('question.cancel', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.cancel({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws BAD_REQUEST when question is not open', async () => {
    mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'resolved_yes' })
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.cancel({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only open questions can be cancelled',
    })
  })

  it('throws FORBIDDEN when user is not the creator or admin', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      createdBy: 'other-user',
      status: 'open',
    })
    mockCanCancelQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.question.cancel({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows creator to cancel their own question', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      createdBy: 'analyst-1',
      status: 'open',
    })
    mockCanCancelQuestion.mockResolvedValue(true)
    const cancelledQuestion = { ...baseQuestion, status: 'cancelled' }
    updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([cancelledQuestion]),
    )

    const caller = createCaller(analystAuth)
    const result = await caller.question.cancel({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      reason: 'No longer relevant',
    })

    expect(result).toEqual(cancelledQuestion)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancelled',
        details: expect.objectContaining({ reason: 'No longer relevant' }),
      }),
    )
  })

  it('allows admin to cancel any question', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      createdBy: 'other-user',
      status: 'open',
    })
    mockCanCancelQuestion.mockResolvedValue(true)
    const cancelledQuestion = { ...baseQuestion, status: 'cancelled' }
    updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([cancelledQuestion]),
    )

    const caller = createCaller(adminAuth)
    const result = await caller.question.cancel({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })

    expect(result).toEqual(cancelledQuestion)
  })
})

// ─── update ─────────────────────────────────────────────────────────

describe('question.update', () => {
  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.update({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        title: 'Updated title',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws BAD_REQUEST when question is not open', async () => {
    mockFindFirst.mockResolvedValue({ ...baseQuestion, status: 'resolved_yes' })
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.update({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        title: 'Updated title',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only open questions can be updated',
    })
  })

  it('throws FORBIDDEN when user lacks edit permission', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      createdBy: 'other-user',
      status: 'open',
    })
    mockCanEditQuestion.mockResolvedValue(false)

    const caller = createCaller(analystAuth)

    await expect(
      caller.question.update({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        title: 'Updated title',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws BAD_REQUEST when changing to team visibility without teamId', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      status: 'open',
      visibility: 'public',
      teamId: null,
    })
    mockCanEditQuestion.mockResolvedValue(true)

    const caller = createCaller(analystAuth)

    await expect(
      caller.question.update({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        visibility: 'team',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Team visibility requires a teamId',
    })
  })

  it('successfully updates an open question with edit permission', async () => {
    mockFindFirst.mockResolvedValue({
      ...baseQuestion,
      status: 'open',
    })
    mockCanEditQuestion.mockResolvedValue(true)
    const updated = { ...baseQuestion, title: 'Updated title' }
    updateChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve([updated]),
    )

    const caller = createCaller(analystAuth)
    const result = await caller.question.update({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Updated title',
    })

    expect(result).toEqual(updated)
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated' }),
    )
  })
})

// ─── delete (admin only) ────────────────────────────────────────────

describe('question.delete', () => {
  it('rejects analyst role', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.delete({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  })

  it('rejects moderator role', async () => {
    const caller = createCaller(moderatorAuth)

    await expect(
      caller.question.delete({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  })

  it('throws NOT_FOUND when question does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const caller = createCaller(adminAuth)

    await expect(
      caller.question.delete({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('deletes question as admin and logs activity', async () => {
    mockFindFirst.mockResolvedValue(baseQuestion)
    deleteChain.then.mockImplementation((resolve: (val: unknown) => void) =>
      resolve(undefined),
    )

    const caller = createCaller(adminAuth)
    const result = await caller.question.delete({
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    })

    expect(result).toEqual({ success: true })
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deleted',
        actorId: 'admin-1',
        details: expect.objectContaining({ title: baseQuestion.title }),
      }),
    )
  })
})

// ─── Input validation ───────────────────────────────────────────────

describe('question input validation', () => {
  it('rejects page < 1 in list', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.list({
        page: 0,
        pageSize: 20,
        sort: 'createdAt',
        sortDir: 'desc',
        filters: {},
      }),
    ).rejects.toThrow()
  })

  it('rejects pageSize > 100 in list', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.list({
        page: 1,
        pageSize: 101,
        sort: 'createdAt',
        sortDir: 'desc',
        filters: {},
      }),
    ).rejects.toThrow()
  })

  it('rejects empty title in create', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.create({
        title: '',
        resolutionCriteria: 'Criteria',
        deadline: new Date('2026-06-01'),
      }),
    ).rejects.toThrow()
  })

  it('rejects empty resolutionCriteria in create', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.create({
        title: 'Valid title',
        resolutionCriteria: '',
        deadline: new Date('2026-06-01'),
      }),
    ).rejects.toThrow()
  })

  it('rejects non-uuid id in get', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.get({ id: 'not-a-uuid' }),
    ).rejects.toThrow()
  })

  it('rejects invalid sort field', async () => {
    const caller = createCaller(analystAuth)

    await expect(
      caller.question.list({
        page: 1,
        pageSize: 20,
        sort: 'invalid' as 'createdAt',
        sortDir: 'desc',
        filters: {},
      }),
    ).rejects.toThrow()
  })
})
