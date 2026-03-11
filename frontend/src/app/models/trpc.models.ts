import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

import type { AppRouter } from '../../../../backend/src/trpc/'

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

// ── User ──
export type User = NonNullable<RouterOutput['user']['get']>
export type UserPreferencesInput = RouterInput['user']['updatePreferences']

// ── Question ──
export type QuestionListOutput = RouterOutput['question']['list']
export type Question = QuestionListOutput['items'][number]
export type QuestionDetail = RouterOutput['question']['get']
export type QuestionCreateInput = RouterInput['question']['create']
export type QuestionUpdateInput = RouterInput['question']['update']
export type QuestionListInput = RouterInput['question']['list']
export type QuestionStatus = NonNullable<QuestionListInput['filters']>['status']

// ── Prediction ──
export type PredictionListOutput = RouterOutput['prediction']['listByQuestion']
export type MyPredictionsOutput = RouterOutput['prediction']['myPredictions']
export type MyPrediction = MyPredictionsOutput['items'][number]
export type PredictionSubmitInput = RouterInput['prediction']['submit']

// ── Calibration ──
export type CalibrationScore = RouterOutput['calibration']['myScores'][number]
export type LeaderboardEntry = RouterOutput['calibration']['leaderboard'][number]

// ── Team ──
export type Team = RouterOutput['team']['list'][number]
export type TeamDetail = RouterOutput['team']['get']
export type TeamCreateInput = RouterInput['team']['create']

// ── Comment ──
export type Comment = RouterOutput['comment']['listByQuestion'][number]
export type CommentCreateInput = RouterInput['comment']['create']

// ── Activity ──
export type ActivityEntry = RouterOutput['activity']['listByEntity']['items'][number]
export type ActivityListOutput = RouterOutput['activity']['listByEntity']

// ── Stats ──
export type QuestionStats = RouterOutput['question']['stats']

// ── App Config ──
export type AppConfig = RouterOutput['appConfig']['get']
