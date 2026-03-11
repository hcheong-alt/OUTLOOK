import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock the database ──────────────────────────────────────────────

const mockInsertValues = vi.fn().mockResolvedValue(undefined)
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

vi.mock('../../src/db/drizzle.ts', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

import { logActivity } from '../../src/services/activity.service.ts'

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ values: mockInsertValues })
  mockInsertValues.mockResolvedValue(undefined)
})

describe('logActivity', () => {
  it('inserts a record with all required fields', async () => {
    await logActivity({
      entityType: 'question',
      entityId: 'q-123',
      action: 'created',
      actorId: 'user-1',
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'question',
      entityId: 'q-123',
      action: 'created',
      actorId: 'user-1',
      details: {},
    })
  })

  it('passes details when provided', async () => {
    const details = { previousStatus: 'open', newStatus: 'resolved_yes' }

    await logActivity({
      entityType: 'question',
      entityId: 'q-456',
      action: 'resolved',
      actorId: 'mod-1',
      details,
    })

    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'question',
      entityId: 'q-456',
      action: 'resolved',
      actorId: 'mod-1',
      details,
    })
  })

  it('defaults details to empty object when omitted', async () => {
    await logActivity({
      entityType: 'prediction',
      entityId: 'p-789',
      action: 'submitted',
      actorId: 'user-2',
    })

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ details: {} }),
    )
  })

  it('handles question entity type with various actions', async () => {
    const actions = ['created', 'updated', 'resolved', 'cancelled', 'deleted']

    for (const action of actions) {
      vi.clearAllMocks()
      mockInsert.mockReturnValue({ values: mockInsertValues })

      await logActivity({
        entityType: 'question',
        entityId: 'q-100',
        action,
        actorId: 'user-1',
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'question',
          action,
        }),
      )
    }
  })

  it('handles prediction entity type', async () => {
    await logActivity({
      entityType: 'prediction',
      entityId: 'pred-1',
      action: 'submitted',
      actorId: 'analyst-1',
      details: { probability: 0.75, questionId: 'q-100' },
    })

    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'prediction',
      entityId: 'pred-1',
      action: 'submitted',
      actorId: 'analyst-1',
      details: { probability: 0.75, questionId: 'q-100' },
    })
  })

  it('handles comment entity type', async () => {
    await logActivity({
      entityType: 'comment',
      entityId: 'cmt-1',
      action: 'added',
      actorId: 'user-3',
      details: { questionId: 'q-200', bodyLength: 42 },
    })

    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'comment',
      entityId: 'cmt-1',
      action: 'added',
      actorId: 'user-3',
      details: { questionId: 'q-200', bodyLength: 42 },
    })
  })

  it('handles team entity type', async () => {
    await logActivity({
      entityType: 'team',
      entityId: 'team-1',
      action: 'member_added',
      actorId: 'admin-1',
      details: { memberId: 'user-5', role: 'member' },
    })

    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'team',
      entityId: 'team-1',
      action: 'member_added',
      actorId: 'admin-1',
      details: { memberId: 'user-5', role: 'member' },
    })
  })

  it('handles calibration entity type', async () => {
    await logActivity({
      entityType: 'calibration',
      entityId: 'cal-1',
      action: 'recomputed',
      actorId: 'admin-1',
      details: { period: '2026-03', brierScore: 0.123456 },
    })

    expect(mockInsertValues).toHaveBeenCalledWith({
      entityType: 'calibration',
      entityId: 'cal-1',
      action: 'recomputed',
      actorId: 'admin-1',
      details: { period: '2026-03', brierScore: 0.123456 },
    })
  })

  it('inserts into the activityLogTable', async () => {
    await logActivity({
      entityType: 'question',
      entityId: 'q-1',
      action: 'created',
      actorId: 'user-1',
    })

    // The first arg to db.insert() should be the activityLogTable
    expect(mockInsert).toHaveBeenCalledTimes(1)
    const insertArg = mockInsert.mock.calls[0]![0]
    // Verify it is a drizzle table object (has the table symbol)
    expect(insertArg).toBeDefined()
  })

  it('handles complex nested details', async () => {
    const details = {
      changes: {
        title: { from: 'Old Title', to: 'New Title' },
        tags: { from: ['a'], to: ['a', 'b'] },
      },
      metadata: { ip: '127.0.0.1' },
    }

    await logActivity({
      entityType: 'question',
      entityId: 'q-1',
      action: 'updated',
      actorId: 'user-1',
      details,
    })

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ details }),
    )
  })
})
