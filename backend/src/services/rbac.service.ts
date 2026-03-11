import { eq } from 'drizzle-orm'

import { db } from '../db/drizzle.ts'
import { teamMemberTable } from '../drizzle/schema.ts'
import type { AuthInfo } from '../middleware/auth.middleware.ts'

export type Action =
  | 'question.create'
  | 'question.edit'
  | 'question.delete'
  | 'question.resolve'
  | 'question.cancel'
  | 'question.view'
  | 'prediction.submit'
  | 'prediction.viewBefore'
  | 'prediction.viewAfter'
  | 'calibration.view'
  | 'calibration.viewDetailed'
  | 'calibration.recompute'
  | 'comment.add'
  | 'team.manage'
  | 'team.manageMembers'

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const memberships = await db.query.teamMemberTable.findMany({
    where: eq(teamMemberTable.userId, userId),
    columns: { teamId: true },
  })
  return memberships.map((m) => m.teamId)
}

export async function isTeamMember(
  userId: string,
  teamId: string,
): Promise<boolean> {
  const membership = await db.query.teamMemberTable.findFirst({
    where: (tm, { and, eq: e }) =>
      and(e(tm.teamId, teamId), e(tm.userId, userId)),
  })
  return !!membership
}

async function isTeamLead(
  userId: string,
  teamId: string,
): Promise<boolean> {
  const membership = await db.query.teamMemberTable.findFirst({
    where: (tm, { and, eq: e }) =>
      and(e(tm.teamId, teamId), e(tm.userId, userId)),
  })
  return membership?.role === 'lead'
}

export async function canViewQuestion(
  auth: AuthInfo,
  question: {
    visibility: string
    teamId: string | null
    createdBy: string
  },
): Promise<boolean> {
  if (auth.role === 'admin') return true
  if (question.visibility === 'public') return true
  if (question.visibility === 'private')
    return question.createdBy === auth.userId
  if (question.visibility === 'team' && question.teamId) {
    return await isTeamMember(auth.userId, question.teamId)
  }
  return false
}

export async function canEditQuestion(
  auth: AuthInfo,
  question: { teamId: string | null; createdBy: string },
): Promise<boolean> {
  if (auth.role === 'admin') return true
  if (auth.role === 'analyst')
    return question.createdBy === auth.userId
  if (auth.role === 'moderator') {
    if (!question.teamId)
      return question.createdBy === auth.userId
    return await isTeamMember(auth.userId, question.teamId)
  }
  return false
}

export function canResolveQuestion(auth: AuthInfo): boolean {
  return auth.role === 'admin' || auth.role === 'moderator'
}

export async function canCancelQuestion(
  auth: AuthInfo,
  question: { createdBy: string },
): Promise<boolean> {
  if (auth.role === 'admin') return true
  return question.createdBy === auth.userId
}

export async function checkPermission(
  auth: AuthInfo,
  action: Action,
  context: {
    teamId?: string | null
    createdBy?: string
    questionVisibility?: string
  },
): Promise<boolean> {
  if (auth.role === 'admin') return true

  const userTeams = await getUserTeamIds(auth.userId)
  const isInTeam = context.teamId ? userTeams.includes(context.teamId) : false
  const isCreator = context.createdBy === auth.userId

  switch (action) {
    case 'question.create':
      return true // All authenticated users can create

    case 'question.edit':
      if (auth.role === 'moderator') {
        if (!context.teamId) return isCreator
        return isInTeam
      }
      return isCreator // analyst: own only

    case 'question.delete':
      return false // admin only

    case 'question.resolve':
      return auth.role === 'moderator'

    case 'question.cancel':
      return isCreator

    case 'question.view':
      if (context.questionVisibility === 'public') return true
      if (context.questionVisibility === 'private') return isCreator
      if (context.questionVisibility === 'team') return isInTeam
      return false

    case 'prediction.submit':
      return true // All authenticated

    case 'prediction.viewBefore':
      return auth.role === 'moderator'

    case 'prediction.viewAfter':
      return true

    case 'calibration.view':
      return true // All see own + leaderboard

    case 'calibration.viewDetailed':
      return auth.role === 'moderator'

    case 'calibration.recompute':
      return false // admin only

    case 'comment.add':
      return true // On visible questions

    case 'team.manage':
      return false // admin only

    case 'team.manageMembers':
      if (!context.teamId) return false
      return await isTeamLead(auth.userId, context.teamId)

    default:
      return false
  }
}
