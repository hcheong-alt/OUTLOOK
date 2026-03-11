import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AuthInfo } from '../../src/middleware/auth.middleware.ts'

// ─── Mock the database ──────────────────────────────────────────────

const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()

vi.mock('../../src/db/drizzle.ts', () => ({
  db: {
    query: {
      teamMemberTable: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}))

import {
  getUserTeamIds,
  isTeamMember,
  canViewQuestion,
  canEditQuestion,
  canResolveQuestion,
  canCancelQuestion,
  checkPermission,
} from '../../src/services/rbac.service.ts'

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

const adminAuth = makeAuth({ userId: 'admin-1', role: 'admin' })
const moderatorAuth = makeAuth({ userId: 'mod-1', role: 'moderator' })
const analystAuth = makeAuth({ userId: 'analyst-1', role: 'analyst' })

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserTeamIds', () => {
  it('returns team IDs for the user', async () => {
    mockFindMany.mockResolvedValue([
      { teamId: 'team-a' },
      { teamId: 'team-b' },
    ])
    const result = await getUserTeamIds('user-1')
    expect(result).toEqual(['team-a', 'team-b'])
  })

  it('returns empty array when user has no teams', async () => {
    mockFindMany.mockResolvedValue([])
    const result = await getUserTeamIds('user-1')
    expect(result).toEqual([])
  })
})

describe('isTeamMember', () => {
  it('returns true when user is a member of the team', async () => {
    mockFindFirst.mockResolvedValue({ teamId: 'team-a', userId: 'user-1', role: 'member' })
    const result = await isTeamMember('user-1', 'team-a')
    expect(result).toBe(true)
  })

  it('returns false when user is not a member of the team', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const result = await isTeamMember('user-1', 'team-a')
    expect(result).toBe(false)
  })
})

describe('canViewQuestion', () => {
  it('admin can view any question', async () => {
    expect(
      await canViewQuestion(adminAuth, {
        visibility: 'private',
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(true)
  })

  it('anyone can view a public question', async () => {
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'public',
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(true)
  })

  it('creator can view their own private question', async () => {
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'private',
        teamId: null,
        createdBy: 'analyst-1',
      }),
    ).toBe(true)
  })

  it('non-creator cannot view a private question', async () => {
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'private',
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })

  it('team member can view a team question', async () => {
    mockFindFirst.mockResolvedValue({ teamId: 'team-a', userId: 'analyst-1', role: 'member' })
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'team',
        teamId: 'team-a',
        createdBy: 'someone-else',
      }),
    ).toBe(true)
  })

  it('non-team-member cannot view a team question', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'team',
        teamId: 'team-a',
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })

  it('returns false for team visibility without a teamId', async () => {
    expect(
      await canViewQuestion(analystAuth, {
        visibility: 'team',
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })
})

describe('canEditQuestion', () => {
  it('admin can edit any question', async () => {
    expect(
      await canEditQuestion(adminAuth, {
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(true)
  })

  it('analyst can edit their own question', async () => {
    expect(
      await canEditQuestion(analystAuth, {
        teamId: null,
        createdBy: 'analyst-1',
      }),
    ).toBe(true)
  })

  it('analyst cannot edit another user question', async () => {
    expect(
      await canEditQuestion(analystAuth, {
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })

  it('moderator can edit their own question (no team)', async () => {
    expect(
      await canEditQuestion(moderatorAuth, {
        teamId: null,
        createdBy: 'mod-1',
      }),
    ).toBe(true)
  })

  it('moderator cannot edit another user question without team', async () => {
    expect(
      await canEditQuestion(moderatorAuth, {
        teamId: null,
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })

  it('moderator can edit team question when they are a member', async () => {
    mockFindFirst.mockResolvedValue({ teamId: 'team-a', userId: 'mod-1', role: 'member' })
    expect(
      await canEditQuestion(moderatorAuth, {
        teamId: 'team-a',
        createdBy: 'someone-else',
      }),
    ).toBe(true)
  })

  it('moderator cannot edit team question when not a member', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    expect(
      await canEditQuestion(moderatorAuth, {
        teamId: 'team-a',
        createdBy: 'someone-else',
      }),
    ).toBe(false)
  })
})

describe('canResolveQuestion', () => {
  it('admin can resolve questions', () => {
    expect(canResolveQuestion(adminAuth)).toBe(true)
  })

  it('moderator can resolve questions', () => {
    expect(canResolveQuestion(moderatorAuth)).toBe(true)
  })

  it('analyst cannot resolve questions', () => {
    expect(canResolveQuestion(analystAuth)).toBe(false)
  })
})

describe('canCancelQuestion', () => {
  it('admin can cancel any question', async () => {
    expect(
      await canCancelQuestion(adminAuth, { createdBy: 'someone-else' }),
    ).toBe(true)
  })

  it('creator can cancel their own question', async () => {
    expect(
      await canCancelQuestion(analystAuth, { createdBy: 'analyst-1' }),
    ).toBe(true)
  })

  it('non-creator cannot cancel another user question', async () => {
    expect(
      await canCancelQuestion(analystAuth, { createdBy: 'someone-else' }),
    ).toBe(false)
  })

  it('moderator can cancel their own question', async () => {
    expect(
      await canCancelQuestion(moderatorAuth, { createdBy: 'mod-1' }),
    ).toBe(true)
  })

  it('moderator cannot cancel another user question', async () => {
    expect(
      await canCancelQuestion(moderatorAuth, { createdBy: 'someone-else' }),
    ).toBe(false)
  })
})

// ─── checkPermission (comprehensive action matrix) ──────────────────

describe('checkPermission', () => {
  describe('admin bypass', () => {
    it('admin is allowed for every action', async () => {
      const actions = [
        'question.create',
        'question.edit',
        'question.delete',
        'question.resolve',
        'question.cancel',
        'question.view',
        'prediction.submit',
        'prediction.viewBefore',
        'prediction.viewAfter',
        'calibration.view',
        'calibration.viewDetailed',
        'calibration.recompute',
        'comment.add',
        'team.manage',
        'team.manageMembers',
      ] as const

      for (const action of actions) {
        const result = await checkPermission(adminAuth, action, {})
        expect(result, `admin should be allowed for ${action}`).toBe(true)
      }
    })
  })

  describe('question.create', () => {
    it('analyst can create questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(await checkPermission(analystAuth, 'question.create', {})).toBe(true)
    })

    it('moderator can create questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(await checkPermission(moderatorAuth, 'question.create', {})).toBe(true)
    })
  })

  describe('question.edit', () => {
    it('analyst can edit their own question', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.edit', {
          createdBy: 'analyst-1',
        }),
      ).toBe(true)
    })

    it('analyst cannot edit another user question', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.edit', {
          createdBy: 'someone-else',
        }),
      ).toBe(false)
    })

    it('moderator can edit team question when member', async () => {
      mockFindMany.mockResolvedValue([{ teamId: 'team-a' }])
      expect(
        await checkPermission(moderatorAuth, 'question.edit', {
          teamId: 'team-a',
          createdBy: 'someone-else',
        }),
      ).toBe(true)
    })

    it('moderator cannot edit team question when not member', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'question.edit', {
          teamId: 'team-a',
          createdBy: 'someone-else',
        }),
      ).toBe(false)
    })

    it('moderator can edit own question without team', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'question.edit', {
          createdBy: 'mod-1',
        }),
      ).toBe(true)
    })

    it('moderator cannot edit other user question without team', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'question.edit', {
          createdBy: 'someone-else',
        }),
      ).toBe(false)
    })
  })

  describe('question.delete', () => {
    it('analyst cannot delete questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.delete', {
          createdBy: 'analyst-1',
        }),
      ).toBe(false)
    })

    it('moderator cannot delete questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'question.delete', {}),
      ).toBe(false)
    })
  })

  describe('question.resolve', () => {
    it('moderator can resolve questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'question.resolve', {}),
      ).toBe(true)
    })

    it('analyst cannot resolve questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.resolve', {}),
      ).toBe(false)
    })
  })

  describe('question.cancel', () => {
    it('creator can cancel their own question', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.cancel', {
          createdBy: 'analyst-1',
        }),
      ).toBe(true)
    })

    it('non-creator cannot cancel another user question', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.cancel', {
          createdBy: 'someone-else',
        }),
      ).toBe(false)
    })
  })

  describe('question.view', () => {
    it('anyone can view public questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'public',
        }),
      ).toBe(true)
    })

    it('creator can view private questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'private',
          createdBy: 'analyst-1',
        }),
      ).toBe(true)
    })

    it('non-creator cannot view private questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'private',
          createdBy: 'someone-else',
        }),
      ).toBe(false)
    })

    it('team member can view team questions', async () => {
      mockFindMany.mockResolvedValue([{ teamId: 'team-a' }])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'team',
          teamId: 'team-a',
        }),
      ).toBe(true)
    })

    it('non-team-member cannot view team questions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'team',
          teamId: 'team-a',
        }),
      ).toBe(false)
    })

    it('returns false for unknown visibility', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'question.view', {
          questionVisibility: 'unknown',
        }),
      ).toBe(false)
    })
  })

  describe('prediction.submit', () => {
    it('analyst can submit predictions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'prediction.submit', {}),
      ).toBe(true)
    })

    it('moderator can submit predictions', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'prediction.submit', {}),
      ).toBe(true)
    })
  })

  describe('prediction.viewBefore', () => {
    it('moderator can view predictions before resolution', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'prediction.viewBefore', {}),
      ).toBe(true)
    })

    it('analyst cannot view predictions before resolution', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'prediction.viewBefore', {}),
      ).toBe(false)
    })
  })

  describe('prediction.viewAfter', () => {
    it('anyone can view predictions after resolution', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'prediction.viewAfter', {}),
      ).toBe(true)
    })
  })

  describe('calibration.view', () => {
    it('anyone can view calibration', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'calibration.view', {}),
      ).toBe(true)
    })
  })

  describe('calibration.viewDetailed', () => {
    it('moderator can view detailed calibration', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'calibration.viewDetailed', {}),
      ).toBe(true)
    })

    it('analyst cannot view detailed calibration', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'calibration.viewDetailed', {}),
      ).toBe(false)
    })
  })

  describe('calibration.recompute', () => {
    it('moderator cannot recompute calibration', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'calibration.recompute', {}),
      ).toBe(false)
    })

    it('analyst cannot recompute calibration', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'calibration.recompute', {}),
      ).toBe(false)
    })
  })

  describe('comment.add', () => {
    it('anyone can add comments', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'comment.add', {}),
      ).toBe(true)
    })
  })

  describe('team.manage', () => {
    it('moderator cannot manage teams', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(moderatorAuth, 'team.manage', {}),
      ).toBe(false)
    })

    it('analyst cannot manage teams', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'team.manage', {}),
      ).toBe(false)
    })
  })

  describe('team.manageMembers', () => {
    it('team lead can manage members', async () => {
      mockFindMany.mockResolvedValue([{ teamId: 'team-a' }])
      mockFindFirst.mockResolvedValue({ teamId: 'team-a', userId: 'analyst-1', role: 'lead' })
      expect(
        await checkPermission(analystAuth, 'team.manageMembers', {
          teamId: 'team-a',
        }),
      ).toBe(true)
    })

    it('non-lead member cannot manage members', async () => {
      mockFindMany.mockResolvedValue([{ teamId: 'team-a' }])
      mockFindFirst.mockResolvedValue({ teamId: 'team-a', userId: 'analyst-1', role: 'member' })
      expect(
        await checkPermission(analystAuth, 'team.manageMembers', {
          teamId: 'team-a',
        }),
      ).toBe(false)
    })

    it('returns false when no teamId provided', async () => {
      mockFindMany.mockResolvedValue([])
      expect(
        await checkPermission(analystAuth, 'team.manageMembers', {}),
      ).toBe(false)
    })

    it('non-member cannot manage members', async () => {
      mockFindMany.mockResolvedValue([])
      mockFindFirst.mockResolvedValue(undefined)
      expect(
        await checkPermission(analystAuth, 'team.manageMembers', {
          teamId: 'team-a',
        }),
      ).toBe(false)
    })
  })
})
