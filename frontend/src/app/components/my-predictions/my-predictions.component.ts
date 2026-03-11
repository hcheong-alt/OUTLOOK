import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
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

interface MockPrediction {
  id: string
  questionId: string
  questionTitle: string
  probability: number
  status: QuestionStatusValue
  outcome: 'correct' | 'incorrect' | 'pending' | 'cancelled'
  brierScore: number | null
  category: string
  deadline: Date
  updatedAt: Date
}

const MOCK_PREDICTIONS: MockPrediction[] = [
  // Open
  { id: 'p1', questionId: 'q1', questionTitle: 'Will the Fed raise interest rates by Q2 2026?', probability: 0.65, status: 'open', outcome: 'pending', brierScore: null, category: 'Finance', deadline: new Date('2026-06-30'), updatedAt: new Date('2026-03-10') },
  { id: 'p2', questionId: 'q2', questionTitle: 'Will the ceasefire hold through April?', probability: 0.28, status: 'open', outcome: 'pending', brierScore: null, category: 'Security', deadline: new Date('2026-04-30'), updatedAt: new Date('2026-03-09') },
  { id: 'p3', questionId: 'q3', questionTitle: 'Will Country X hold elections on schedule?', probability: 0.82, status: 'open', outcome: 'pending', brierScore: null, category: 'Politics', deadline: new Date('2026-05-15'), updatedAt: new Date('2026-03-08') },
  { id: 'p5', questionId: 'q5', questionTitle: 'Will the semiconductor export ban be expanded?', probability: 0.51, status: 'open', outcome: 'pending', brierScore: null, category: 'Technology', deadline: new Date('2026-07-01'), updatedAt: new Date('2026-03-05') },
  { id: 'p6', questionId: 'q6', questionTitle: 'Will global oil prices exceed $100/barrel in Q2?', probability: 0.20, status: 'open', outcome: 'pending', brierScore: null, category: 'Finance', deadline: new Date('2026-06-30'), updatedAt: new Date('2026-03-04') },
  { id: 'p11', questionId: 'q11', questionTitle: 'Will the Arctic shipping route see 50% more traffic?', probability: 0.35, status: 'open', outcome: 'pending', brierScore: null, category: 'Climate', deadline: new Date('2026-09-30'), updatedAt: new Date('2026-03-02') },
  { id: 'p13', questionId: 'q13', questionTitle: 'Will the coalition government survive the no-confidence vote?', probability: 0.55, status: 'open', outcome: 'pending', brierScore: null, category: 'Politics', deadline: new Date('2026-04-10'), updatedAt: new Date('2026-03-01') },
  { id: 'p14', questionId: 'q14', questionTitle: 'Will the humanitarian corridor be established by end of month?', probability: 0.30, status: 'open', outcome: 'pending', brierScore: null, category: 'Security', deadline: new Date('2026-03-31'), updatedAt: new Date('2026-03-06') },

  // Resolved Correct
  { id: 'p4', questionId: 'q4', questionTitle: 'Will the bilateral trade deal be signed at the summit?', probability: 0.78, status: 'resolved_yes', outcome: 'correct', brierScore: 0.048, category: 'Diplomacy', deadline: new Date('2026-03-01'), updatedAt: new Date('2026-02-25') },
  { id: 'p7', questionId: 'q7', questionTitle: 'Will the UN Security Council pass the climate resolution?', probability: 0.72, status: 'resolved_yes', outcome: 'correct', brierScore: 0.078, category: 'Climate', deadline: new Date('2026-02-28'), updatedAt: new Date('2026-02-20') },
  { id: 'p10', questionId: 'q10', questionTitle: 'Will the ECB cut rates before July 2026?', probability: 0.68, status: 'resolved_yes', outcome: 'correct', brierScore: 0.102, category: 'Finance', deadline: new Date('2026-06-30'), updatedAt: new Date('2026-02-15') },

  // Resolved Incorrect
  { id: 'p8', questionId: 'q8', questionTitle: 'Will NATO expand air defense deployments to Finland?', probability: 0.60, status: 'resolved_no', outcome: 'incorrect', brierScore: 0.360, category: 'Military', deadline: new Date('2026-03-01'), updatedAt: new Date('2026-02-18') },
  { id: 'p25', questionId: 'q25', questionTitle: 'Will the alliance conduct joint naval exercises in the South China Sea?', probability: 0.62, status: 'resolved_no', outcome: 'incorrect', brierScore: 0.384, category: 'Military', deadline: new Date('2026-02-28'), updatedAt: new Date('2026-02-10') },

  // Cancelled
  { id: 'p9', questionId: 'q9', questionTitle: 'Will the trade negotiations conclude this week?', probability: 0.40, status: 'cancelled', outcome: 'cancelled', brierScore: null, category: 'Trade', deadline: new Date('2026-03-14'), updatedAt: new Date('2026-03-07') },

  // Ambiguous
  { id: 'p26', questionId: 'q26', questionTitle: 'Will the vaccine distribution target of 80% coverage be met?', probability: 0.50, status: 'ambiguous', outcome: 'cancelled', brierScore: null, category: 'Politics', deadline: new Date('2026-03-01'), updatedAt: new Date('2026-02-22') },
]

@Component({
  selector: 'app-my-predictions',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    BadgeComponent,
    LoaderComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-xl font-medium text-gray-900">My Predictions</h1>
          <p class="mt-1 text-sm text-gray-500">Your personal forecasting portfolio and track record.</p>
        </div>

        <!-- Summary stats -->
        <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-gray-500">Total Predictions</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ stats().total }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-gray-500">Open</p>
            <p class="mt-1 text-3xl font-bold text-blue-600">{{ stats().open }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-gray-500">Correct</p>
            <p class="mt-1 text-3xl font-bold text-emerald-600">{{ stats().correct }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-gray-500">Incorrect</p>
            <p class="mt-1 text-3xl font-bold text-red-600">{{ stats().incorrect }}</p>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p class="text-sm text-gray-500">Average Brier</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ stats().avgBrier }}</p>
          </div>
        </div>

        <!-- Calibration chart placeholder -->
        <div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-sm font-semibold text-gray-800">Personal Calibration</h2>
          <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
            <div class="text-center">
              <app-icon name="bar-chart-3" class="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p class="text-sm text-gray-500">Calibration chart will be rendered here</p>
              <p class="text-xs text-gray-400">Chart.js integration planned</p>
            </div>
          </div>
        </div>

        <!-- Open predictions -->
        <div class="mb-8">
          <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div class="h-2 w-2 rounded-full bg-blue-500"></div>
            Open Predictions ({{ openPredictions().length }})
          </h2>
          @if (openPredictions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
              <app-icon name="inbox" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No open predictions</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              @for (pred of openPredictions(); track pred.id) {
                <a
                  [routerLink]="['/questions', pred.questionId]"
                  class="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                    <span class="text-xs text-gray-400">{{ formatDate(pred.deadline) }}</span>
                  </div>
                  <h3 class="mb-3 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-rose-600">
                    {{ pred.questionTitle }}
                  </h3>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                        <div
                          class="h-full rounded-full bg-rose-400"
                          [style.width.%]="pred.probability * 100"
                        ></div>
                      </div>
                      <span class="text-sm font-bold text-gray-900">{{ (pred.probability * 100).toFixed(0) }}%</span>
                    </div>
                    <span class="text-xs text-gray-400">Updated {{ formatDate(pred.updatedAt) }}</span>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <!-- Resolved Correct -->
        <div class="mb-8">
          <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
            Resolved - Correct ({{ correctPredictions().length }})
          </h2>
          @if (correctPredictions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
              <app-icon name="check-circle" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No correct predictions yet</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              @for (pred of correctPredictions(); track pred.id) {
                <a
                  [routerLink]="['/questions', pred.questionId]"
                  class="group rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                    <app-badge text="Correct" colorClass="bg-emerald-100 text-emerald-800" />
                  </div>
                  <h3 class="mb-3 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-emerald-700">
                    {{ pred.questionTitle }}
                  </h3>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-900">{{ (pred.probability * 100).toFixed(0) }}%</span>
                    <div class="flex items-center gap-1 text-xs text-emerald-700">
                      <app-icon name="trending-up" class="h-3 w-3" />
                      Brier: {{ pred.brierScore?.toFixed(3) ?? '--' }}
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <!-- Resolved Incorrect -->
        <div class="mb-8">
          <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div class="h-2 w-2 rounded-full bg-red-500"></div>
            Resolved - Incorrect ({{ incorrectPredictions().length }})
          </h2>
          @if (incorrectPredictions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
              <app-icon name="x" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No incorrect predictions</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              @for (pred of incorrectPredictions(); track pred.id) {
                <a
                  [routerLink]="['/questions', pred.questionId]"
                  class="group rounded-lg border border-red-200 bg-red-50/50 p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                    <app-badge text="Incorrect" colorClass="bg-red-100 text-red-800" />
                  </div>
                  <h3 class="mb-3 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-red-700">
                    {{ pred.questionTitle }}
                  </h3>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-900">{{ (pred.probability * 100).toFixed(0) }}%</span>
                    <div class="flex items-center gap-1 text-xs text-red-700">
                      <app-icon name="trending-down" class="h-3 w-3" />
                      Brier: {{ pred.brierScore?.toFixed(3) ?? '--' }}
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <!-- Cancelled / Ambiguous -->
        <div class="mb-8">
          <h2 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div class="h-2 w-2 rounded-full bg-gray-400"></div>
            Cancelled / Ambiguous ({{ cancelledPredictions().length }})
          </h2>
          @if (cancelledPredictions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
              <app-icon name="archive" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No cancelled predictions</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              @for (pred of cancelledPredictions(); track pred.id) {
                <a
                  [routerLink]="['/questions', pred.questionId]"
                  class="group rounded-lg border border-gray-200 bg-gray-50/50 p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                    <app-badge
                      [text]="statusLabels[pred.status]"
                      [colorClass]="statusColors[pred.status]"
                    />
                  </div>
                  <h3 class="mb-3 line-clamp-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {{ pred.questionTitle }}
                  </h3>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-600">{{ (pred.probability * 100).toFixed(0) }}%</span>
                    <span class="text-xs text-gray-400">Not scored</span>
                  </div>
                </a>
              }
            </div>
          }
        </div>

      </div>
    </div>
  `,
})
export class MyPredictionsComponent {
  // ── Constants ──
  readonly statusLabels = QUESTION_STATUS_LABELS
  readonly statusColors = QUESTION_STATUS_COLORS

  // ── Mock data ──
  private readonly predictions = signal<MockPrediction[]>(MOCK_PREDICTIONS)

  // ── Computed groups ──
  openPredictions = computed(() =>
    this.predictions().filter((p) => p.outcome === 'pending'),
  )

  correctPredictions = computed(() =>
    this.predictions().filter((p) => p.outcome === 'correct'),
  )

  incorrectPredictions = computed(() =>
    this.predictions().filter((p) => p.outcome === 'incorrect'),
  )

  cancelledPredictions = computed(() =>
    this.predictions().filter((p) => p.outcome === 'cancelled'),
  )

  stats = computed(() => {
    const all = this.predictions()
    const resolved = all.filter((p) => p.brierScore !== null)
    const avgBrier = resolved.length > 0
      ? (resolved.reduce((sum, p) => sum + (p.brierScore ?? 0), 0) / resolved.length).toFixed(3)
      : '--'

    return {
      total: all.length,
      open: this.openPredictions().length,
      correct: this.correctPredictions().length,
      incorrect: this.incorrectPredictions().length,
      avgBrier,
    }
  })

  // ── Helpers ──
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
}
