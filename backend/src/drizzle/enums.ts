import { pgSchema } from 'drizzle-orm/pg-core'

export const app = pgSchema('app')

export const questionStatusEnum = app.enum('question_status', [
  'open',
  'resolved_yes',
  'resolved_no',
  'ambiguous',
  'cancelled',
])

export const visibilityEnum = app.enum('visibility', [
  'public',
  'team',
  'private',
])

export const userRoleEnum = app.enum('user_role', [
  'admin',
  'moderator',
  'analyst',
])

export const teamRoleEnum = app.enum('team_role', ['lead', 'member'])
