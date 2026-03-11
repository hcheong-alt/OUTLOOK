export const QUESTION_STATUS = {
  open: 'open',
  resolved_yes: 'resolved_yes',
  resolved_no: 'resolved_no',
  ambiguous: 'ambiguous',
  cancelled: 'cancelled',
} as const

export type QuestionStatusValue =
  (typeof QUESTION_STATUS)[keyof typeof QUESTION_STATUS]

export const QUESTION_STATUS_LABELS: Record<QuestionStatusValue, string> = {
  open: 'Open',
  resolved_yes: 'Resolved Yes',
  resolved_no: 'Resolved No',
  ambiguous: 'Ambiguous',
  cancelled: 'Cancelled',
}

export const QUESTION_STATUS_COLORS: Record<QuestionStatusValue, string> = {
  open: 'bg-blue-100 text-blue-800',
  resolved_yes: 'bg-green-100 text-green-800',
  resolved_no: 'bg-red-100 text-red-800',
  ambiguous: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const VISIBILITY = {
  public: 'public',
  team: 'team',
  private: 'private',
} as const

export type VisibilityValue = (typeof VISIBILITY)[keyof typeof VISIBILITY]
