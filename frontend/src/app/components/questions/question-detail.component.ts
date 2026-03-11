import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { toast } from 'ngx-sonner'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import { LoaderComponent } from '@shared/components/loader/loader.component'
import {
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_COLORS,
} from '@models/enums'
import type { QuestionStatusValue } from '@models/enums'
import type { LucideIconName } from '@shared/components/icon/icon.component'

// ── Mock data ──

interface MockPredictionRevision {
  id: string
  probability: number
  reasoning: string
  createdAt: Date
}

interface MockCommunityStats {
  mean: number
  median: number
  count: number
  stdDev: number
}

interface MockPredictionEntry {
  id: string
  analyst: string
  probability: number
  updatedAt: Date
  brierScore: number | null
}

interface MockComment {
  id: string
  author: string
  text: string
  createdAt: Date
}

interface MockActivityEntry {
  id: string
  actor: string
  action: string
  createdAt: Date
}

const MOCK_QUESTION = {
  id: 'q1',
  title: 'Will the Fed raise interest rates by Q2 2026?',
  category: 'Finance',
  status: 'open' as QuestionStatusValue,
  deadline: new Date('2026-06-30'),
  predictions: 12,
  consensus: 0.65,
  description: 'The Federal Reserve is expected to review monetary policy in Q2 2026. This question tracks whether the Fed will increase the federal funds rate by at least 25 basis points before June 30, 2026. Factors include inflation data, employment numbers, and global economic conditions.',
  resolutionCriteria: 'The Federal Open Market Committee (FOMC) announces an increase in the target federal funds rate of at least 25 basis points at any meeting through June 30, 2026.',
  visibility: 'public' as const,
  createdAt: new Date('2026-01-15'),
  createdBy: 'Sarah Chen',
}

const MOCK_MY_REVISIONS: MockPredictionRevision[] = [
  { id: 'pr1', probability: 0.65, reasoning: 'Inflation remains sticky above 3%. March CPI data suggests persistent price pressure. Fed rhetoric has turned hawkish.', createdAt: new Date('2026-03-10') },
  { id: 'pr2', probability: 0.55, reasoning: 'Initial assessment based on December FOMC minutes and January employment data showing moderate wage growth.', createdAt: new Date('2026-02-01') },
  { id: 'pr3', probability: 0.45, reasoning: 'Baseline estimate. Mixed signals from the economy - strong employment but weakening consumer confidence.', createdAt: new Date('2026-01-16') },
]

const MOCK_COMMUNITY_STATS: MockCommunityStats = {
  mean: 0.62,
  median: 0.65,
  count: 12,
  stdDev: 0.14,
}

const MOCK_COMMUNITY_PREDICTIONS: MockPredictionEntry[] = [
  { id: 'cp1', analyst: 'Sarah Chen', probability: 0.72, updatedAt: new Date('2026-03-10'), brierScore: null },
  { id: 'cp2', analyst: 'James Rodriguez', probability: 0.65, updatedAt: new Date('2026-03-09'), brierScore: null },
  { id: 'cp3', analyst: 'Aisha Patel', probability: 0.58, updatedAt: new Date('2026-03-08'), brierScore: null },
  { id: 'cp4', analyst: 'Marcus Johnson', probability: 0.70, updatedAt: new Date('2026-03-07'), brierScore: null },
  { id: 'cp5', analyst: 'Yuki Tanaka', probability: 0.55, updatedAt: new Date('2026-03-06'), brierScore: null },
  { id: 'cp6', analyst: 'David Okonkwo', probability: 0.80, updatedAt: new Date('2026-03-05'), brierScore: null },
  { id: 'cp7', analyst: 'Elena Volkov', probability: 0.48, updatedAt: new Date('2026-03-04'), brierScore: null },
  { id: 'cp8', analyst: 'Thomas Mueller', probability: 0.61, updatedAt: new Date('2026-03-03'), brierScore: null },
  { id: 'cp9', analyst: 'Fatima Al-Rashid', probability: 0.67, updatedAt: new Date('2026-03-02'), brierScore: null },
  { id: 'cp10', analyst: 'Wei Zhang', probability: 0.42, updatedAt: new Date('2026-03-01'), brierScore: null },
  { id: 'cp11', analyst: 'Carlos Mendez', probability: 0.59, updatedAt: new Date('2026-02-28'), brierScore: null },
  { id: 'cp12', analyst: 'Priya Sharma', probability: 0.71, updatedAt: new Date('2026-02-27'), brierScore: null },
]

const MOCK_COMMENTS: MockComment[] = [
  { id: 'c1', author: 'James Rodriguez', text: 'The latest CPI report came in above expectations. I think the probability of a rate hike is higher than the consensus suggests.', createdAt: new Date('2026-03-09T14:30:00') },
  { id: 'c2', author: 'Aisha Patel', text: 'Agree on the CPI data, but the labor market is showing signs of cooling. The February jobs report was weaker than expected.', createdAt: new Date('2026-03-09T15:45:00') },
  { id: 'c3', author: 'David Okonkwo', text: 'Keep an eye on the March FOMC minutes. The dot plot will be key for gauging the committee sentiment.', createdAt: new Date('2026-03-08T10:20:00') },
  { id: 'c4', author: 'Sarah Chen', text: 'Updated my prediction to 72% after reviewing the latest Fed governor speeches. The tone has noticeably shifted hawkish.', createdAt: new Date('2026-03-07T16:00:00') },
  { id: 'c5', author: 'Elena Volkov', text: 'I remain more skeptical. Global growth is slowing and the Fed may prioritize stability over inflation fighting.', createdAt: new Date('2026-03-06T09:15:00') },
]

const MOCK_ACTIVITY: MockActivityEntry[] = [
  { id: 'a1', actor: 'Sarah Chen', action: 'updated prediction to 72%', createdAt: new Date('2026-03-10T10:00:00') },
  { id: 'a2', actor: 'James Rodriguez', action: 'added a comment', createdAt: new Date('2026-03-09T14:30:00') },
  { id: 'a3', actor: 'Aisha Patel', action: 'updated prediction to 58%', createdAt: new Date('2026-03-08T11:00:00') },
  { id: 'a4', actor: 'Marcus Johnson', action: 'submitted initial prediction of 70%', createdAt: new Date('2026-03-07T09:00:00') },
  { id: 'a5', actor: 'David Okonkwo', action: 'added a comment', createdAt: new Date('2026-03-08T10:20:00') },
  { id: 'a6', actor: 'System', action: 'question created', createdAt: new Date('2026-01-15T08:00:00') },
]

type Tab = 'predict' | 'community' | 'comments' | 'activity'

@Component({
  selector: 'app-question-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    BadgeComponent,
    LoaderComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Back link -->
        <a
          routerLink="/questions"
          class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <app-icon name="arrow-left" class="h-4 w-4" />
          Back to Questions
        </a>

        <!-- Header -->
        <div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div class="mb-3 flex items-start justify-between">
            <div class="flex items-center gap-2">
              <app-badge [text]="statusLabels[question.status]" [colorClass]="statusColors[question.status]" />
              <app-badge [text]="question.category" colorClass="bg-gray-100 text-gray-700" />
              <app-badge [text]="question.visibility" colorClass="bg-blue-50 text-blue-700" />
            </div>
            <div class="text-right text-xs text-gray-500">
              <p>Created by {{ question.createdBy }} on {{ formatDate(question.createdAt) }}</p>
            </div>
          </div>

          <h1 class="mb-3 text-xl font-medium text-gray-900">{{ question.title }}</h1>

          <div class="mb-4 flex items-center gap-6 text-sm text-gray-600">
            <div class="flex items-center gap-1.5">
              <app-icon name="calendar-days" class="h-4 w-4 text-gray-400" />
              Deadline: {{ formatDate(question.deadline) }}
            </div>
            <div class="flex items-center gap-1.5">
              <app-icon name="users" class="h-4 w-4 text-gray-400" />
              {{ question.predictions }} predictions
            </div>
            <div class="flex items-center gap-1.5">
              <app-icon name="bar-chart-3" class="h-4 w-4 text-gray-400" />
              Consensus: {{ (question.consensus * 100).toFixed(0) }}%
            </div>
          </div>

          <!-- Resolution criteria -->
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Resolution Criteria</h3>
            <p class="text-sm text-gray-700">{{ question.resolutionCriteria }}</p>
          </div>

          @if (question.description) {
            <div class="mt-3">
              <h3 class="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</h3>
              <p class="text-sm text-gray-700">{{ question.description }}</p>
            </div>
          }
        </div>

        <!-- Tabs -->
        <div class="mb-6 flex border-b border-gray-200">
          @for (tab of tabs; track tab.key) {
            <button
              class="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors"
              [class]="activeTab() === tab.key
                ? 'text-rose-600'
                : 'text-gray-500 hover:text-gray-700'"
              (click)="activeTab.set(tab.key)"
            >
              <app-icon [name]="tab.icon" class="h-4 w-4" />
              {{ tab.label }}
              @if (activeTab() === tab.key) {
                <div class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-rose-500"></div>
              }
            </button>
          }
        </div>

        <!-- Tab content -->

        <!-- ═══ Predict Tab ═══ -->
        @if (activeTab() === 'predict') {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Prediction form (2/3) -->
            <div class="lg:col-span-2">
              <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 class="mb-4 text-sm font-semibold text-gray-800">Submit Your Prediction</h2>

                <!-- Probability slider -->
                <div class="mb-4">
                  <div class="mb-2 flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700">Probability</label>
                    <span class="text-2xl font-bold text-rose-600">{{ (predictionValue() * 100).toFixed(0) }}%</span>
                  </div>
                  <input
                    type="range"
                    class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-rose-500"
                    min="0"
                    max="100"
                    step="1"
                    [ngModel]="predictionValue() * 100"
                    (ngModelChange)="predictionValue.set($event / 100)"
                  />
                  <div class="mt-1 flex justify-between text-xs text-gray-400">
                    <span>0% (No)</span>
                    <span>50% (Toss-up)</span>
                    <span>100% (Yes)</span>
                  </div>
                </div>

                <!-- Reasoning -->
                <div class="mb-4">
                  <label class="mb-1 block text-sm font-medium text-gray-700">Reasoning</label>
                  <textarea
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                    rows="4"
                    placeholder="What evidence or analysis supports this probability estimate?"
                    [ngModel]="predictionReasoning()"
                    (ngModelChange)="predictionReasoning.set($event)"
                    maxlength="5000"
                  ></textarea>
                </div>

                <button
                  class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                  (click)="submitPrediction()"
                >
                  Submit Prediction
                </button>
              </div>
            </div>

            <!-- Revision history (1/3) -->
            <div>
              <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div class="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                  <app-icon name="history" class="h-4 w-4 text-rose-500" />
                  <h2 class="text-sm font-semibold text-gray-800">My Revisions</h2>
                </div>
                @if (myRevisions.length === 0) {
                  <div class="px-5 py-8 text-center">
                    <app-icon name="target" class="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p class="text-sm text-gray-500">No predictions yet</p>
                    <p class="text-xs text-gray-400">Submit your first prediction</p>
                  </div>
                } @else {
                  <div class="divide-y divide-gray-50">
                    @for (rev of myRevisions; track rev.id) {
                      <div class="px-5 py-3">
                        <div class="mb-1 flex items-center justify-between">
                          <span class="text-lg font-bold text-gray-900">{{ (rev.probability * 100).toFixed(0) }}%</span>
                          <span class="text-xs text-gray-400">{{ formatDateTime(rev.createdAt) }}</span>
                        </div>
                        <p class="line-clamp-2 text-xs text-gray-600">{{ rev.reasoning }}</p>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ═══ Community Tab ═══ -->
        @if (activeTab() === 'community') {
          <div class="space-y-6">
            <!-- Aggregate stats -->
            <div class="grid grid-cols-4 gap-4">
              <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p class="text-sm text-gray-500">Mean</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">{{ (communityStats.mean * 100).toFixed(0) }}%</p>
              </div>
              <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p class="text-sm text-gray-500">Median</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">{{ (communityStats.median * 100).toFixed(0) }}%</p>
              </div>
              <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p class="text-sm text-gray-500">Predictions</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">{{ communityStats.count }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
                <p class="text-sm text-gray-500">Std Dev</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">{{ (communityStats.stdDev * 100).toFixed(0) }}%</p>
              </div>
            </div>

            <!-- Prediction table -->
            <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Analyst</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Probability</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Last Updated</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Brier Score</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of communityPredictions; track p.id) {
                    <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-medium text-rose-600">
                            {{ getInitials(p.analyst) }}
                          </div>
                          <span class="font-medium text-gray-900">{{ p.analyst }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div
                              class="h-full rounded-full bg-rose-400"
                              [style.width.%]="p.probability * 100"
                            ></div>
                          </div>
                          <span class="font-medium text-gray-900">{{ (p.probability * 100).toFixed(0) }}%</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-gray-600">{{ formatDate(p.updatedAt) }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ p.brierScore !== null ? p.brierScore.toFixed(3) : '--' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ═══ Comments Tab ═══ -->
        @if (activeTab() === 'comments') {
          <div class="space-y-4">
            <!-- Add comment form -->
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <label class="mb-1 block text-sm font-medium text-gray-700">Add a Comment</label>
              <textarea
                class="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                rows="3"
                placeholder="Share analysis, evidence, or questions..."
                [ngModel]="newCommentText()"
                (ngModelChange)="newCommentText.set($event)"
                maxlength="5000"
              ></textarea>
              <button
                class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="!newCommentText().trim()"
                (click)="submitComment()"
              >
                Post Comment
              </button>
            </div>

            <!-- Comments list -->
            @if (comments().length === 0) {
              <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
                <app-icon name="message-circle" class="mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">No comments yet</p>
                <p class="text-xs text-gray-400">Be the first to share your analysis</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (comment of comments(); track comment.id) {
                  <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div class="mb-2 flex items-center gap-2">
                      <div class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-medium text-rose-600">
                        {{ getInitials(comment.author) }}
                      </div>
                      <span class="text-sm font-medium text-gray-900">{{ comment.author }}</span>
                      <span class="text-xs text-gray-400">{{ formatDateTime(comment.createdAt) }}</span>
                    </div>
                    <p class="text-sm text-gray-700">{{ comment.text }}</p>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ═══ Activity Tab ═══ -->
        @if (activeTab() === 'activity') {
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-800">Activity Timeline</h2>
            </div>
            @if (activityEntries.length === 0) {
              <div class="px-5 py-12 text-center">
                <app-icon name="activity" class="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p class="text-sm text-gray-500">No activity yet</p>
              </div>
            } @else {
              <div class="divide-y divide-gray-50">
                @for (entry of activityEntries; track entry.id) {
                  <div class="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                    <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {{ getInitials(entry.actor) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-gray-700">
                        <span class="font-medium text-gray-900">{{ entry.actor }}</span>
                        {{ entry.action }}
                      </p>
                      <span class="text-xs text-gray-400">{{ formatDateTime(entry.createdAt) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
})
export class QuestionDetailComponent {
  private readonly route = inject(ActivatedRoute)

  // ── Constants ──
  readonly statusLabels = QUESTION_STATUS_LABELS
  readonly statusColors = QUESTION_STATUS_COLORS

  readonly tabs: { key: Tab; label: string; icon: LucideIconName }[] = [
    { key: 'predict', label: 'Predict', icon: 'target' },
    { key: 'community', label: 'Community', icon: 'users' },
    { key: 'comments', label: 'Comments', icon: 'message-circle' },
    { key: 'activity', label: 'Activity', icon: 'activity' },
  ]

  // ── State ──
  activeTab = signal<Tab>('predict')
  predictionValue = signal(0.5)
  predictionReasoning = signal('')
  newCommentText = signal('')

  // ── Mock data ──
  readonly question = MOCK_QUESTION
  readonly myRevisions = MOCK_MY_REVISIONS
  readonly communityStats = MOCK_COMMUNITY_STATS
  readonly communityPredictions = MOCK_COMMUNITY_PREDICTIONS
  readonly activityEntries = MOCK_ACTIVITY
  comments = signal<MockComment[]>(MOCK_COMMENTS)

  // ── Route param ──
  readonly questionId = computed(() => this.route.snapshot.paramMap.get('id') ?? '')

  // ── Actions ──
  submitPrediction() {
    const probability = this.predictionValue()
    const reasoning = this.predictionReasoning().trim()

    if (!reasoning) {
      toast.error('Please provide reasoning for your prediction')
      return
    }

    // Mock: just show toast
    toast(`Prediction submitted: ${(probability * 100).toFixed(0)}%`)
    this.predictionReasoning.set('')
  }

  submitComment() {
    const text = this.newCommentText().trim()
    if (!text) return

    const newComment: MockComment = {
      id: 'c' + (this.comments().length + 1),
      author: 'Current User',
      text,
      createdAt: new Date(),
    }
    this.comments.set([newComment, ...this.comments()])
    this.newCommentText.set('')
    toast('Comment posted')
  }

  // ── Helpers ──
  getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
