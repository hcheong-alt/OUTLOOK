import { relations, sql } from 'drizzle-orm'
import {
  check,
  decimal,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  app,
  questionStatusEnum,
  teamRoleEnum,
  userRoleEnum,
  visibilityEnum,
} from './enums.ts'

// ─── Types ───────────────────────────────────────────────────────────

export interface UserPreferences {
  dashboard?: { widgets?: string[]; layout?: string }
  charts?: { style?: string }
  defaultVisibility?: 'public' | 'team' | 'private'
}

export interface ExternalRef {
  source: string
  id: string
  url?: string
}

export interface AccuracyBuckets {
  [bucket: string]: { predicted: number; actual: number }
}

// ─── Tables ──────────────────────────────────────────────────────────

export const userTable = app.table('user', {
  id: uuid('id').primaryKey(), // Keycloak subject ID
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull().default('analyst'),
  preferences: jsonb('preferences').$type<UserPreferences>(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const teamTable = app.table('team', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const teamMemberTable = app.table(
  'team_member',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teamTable.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id),
    role: teamRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index('tm_user_idx').on(table.userId),
  ],
)

export const questionTable = app.table(
  'question',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    resolutionCriteria: text('resolution_criteria').notNull(),
    deadline: timestamp('deadline', { mode: 'date' }).notNull(),
    status: questionStatusEnum('status').notNull().default('open'),
    resolutionNotes: text('resolution_notes'),
    resolvedAt: timestamp('resolved_at', { mode: 'date' }),
    resolvedBy: uuid('resolved_by').references(() => userTable.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => userTable.id),
    teamId: uuid('team_id').references(() => teamTable.id),
    tags: text('tags').array(),
    externalRef: jsonb('external_ref').$type<ExternalRef | null>(),
    visibility: visibilityEnum('visibility').notNull().default('public'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      'visibility_team_check',
      sql`${table.visibility} != 'team' OR ${table.teamId} IS NOT NULL`,
    ),
    index('question_status_idx').on(table.status),
    index('question_created_by_idx').on(table.createdBy),
  ],
)

export const predictionTable = app.table(
  'prediction',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questionTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id),
    probability: decimal('probability', { precision: 5, scale: 4 }).notNull(),
    reasoning: text('reasoning'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'probability_range',
      sql`${table.probability} > 0 AND ${table.probability} < 1`,
    ),
    index('prediction_question_user_idx').on(
      table.questionId,
      table.userId,
      table.createdAt,
    ),
  ],
)

export const calibrationScoreTable = app.table(
  'calibration_score',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => userTable.id),
    period: text('period').notNull(),
    brierScore: decimal('brier_score', { precision: 8, scale: 6 }),
    totalPredictions: integer('total_predictions').notNull().default(0),
    resolvedPredictions: integer('resolved_predictions').notNull().default(0),
    accuracyBuckets: jsonb('accuracy_buckets').$type<AccuracyBuckets>(),
    computedAt: timestamp('computed_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('calibration_user_period_unique').on(table.userId, table.period),
  ],
)

export const commentTable = app.table(
  'comment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id').references(() => questionTable.id, {
      onDelete: 'set null',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => userTable.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [index('comment_question_idx').on(table.questionId)],
)

export const activityLogTable = app.table(
  'activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: text('action').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => userTable.id),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('activity_entity_idx').on(table.entityType, table.entityId),
  ],
)

// ─── Relations ───────────────────────────────────────────────────────

export const userRelations = relations(userTable, ({ many }) => ({
  createdQuestions: many(questionTable, { relationName: 'question_creator' }),
  predictions: many(predictionTable),
  calibrationScores: many(calibrationScoreTable),
  teamMemberships: many(teamMemberTable),
  comments: many(commentTable),
}))

export const teamRelations = relations(teamTable, ({ one, many }) => ({
  createdBy: one(userTable, {
    fields: [teamTable.createdBy],
    references: [userTable.id],
  }),
  members: many(teamMemberTable),
  questions: many(questionTable),
}))

export const teamMemberRelations = relations(teamMemberTable, ({ one }) => ({
  team: one(teamTable, {
    fields: [teamMemberTable.teamId],
    references: [teamTable.id],
  }),
  user: one(userTable, {
    fields: [teamMemberTable.userId],
    references: [userTable.id],
  }),
}))

export const questionRelations = relations(
  questionTable,
  ({ one, many }) => ({
    creator: one(userTable, {
      fields: [questionTable.createdBy],
      references: [userTable.id],
      relationName: 'question_creator',
    }),
    resolver: one(userTable, {
      fields: [questionTable.resolvedBy],
      references: [userTable.id],
      relationName: 'question_resolver',
    }),
    team: one(teamTable, {
      fields: [questionTable.teamId],
      references: [teamTable.id],
    }),
    predictions: many(predictionTable),
    comments: many(commentTable),
  }),
)

export const predictionRelations = relations(predictionTable, ({ one }) => ({
  question: one(questionTable, {
    fields: [predictionTable.questionId],
    references: [questionTable.id],
  }),
  user: one(userTable, {
    fields: [predictionTable.userId],
    references: [userTable.id],
  }),
}))

export const calibrationScoreRelations = relations(
  calibrationScoreTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [calibrationScoreTable.userId],
      references: [userTable.id],
    }),
  }),
)

export const commentRelations = relations(commentTable, ({ one }) => ({
  question: one(questionTable, {
    fields: [commentTable.questionId],
    references: [questionTable.id],
  }),
  author: one(userTable, {
    fields: [commentTable.authorId],
    references: [userTable.id],
  }),
}))

export const activityLogRelations = relations(
  activityLogTable,
  ({ one }) => ({
    actor: one(userTable, {
      fields: [activityLogTable.actorId],
      references: [userTable.id],
    }),
  }),
)
