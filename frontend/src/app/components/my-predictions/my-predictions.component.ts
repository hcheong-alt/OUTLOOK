import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
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
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-xl font-medium text-gray-900">My Predictions</h1>
          <p class="mt-1 text-sm text-gray-500">Your personal forecasting portfolio and track record.</p>
        </div>

        <!-- Summary stats (shared across all variants) -->
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

        <!-- ════════════════════════════════════════════════════ -->
        <!-- VARIANT A — Card Groups (current design)           -->
        <!-- ════════════════════════════════════════════════════ -->
        @if (variant() === 'A') {
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
        }

        <!-- ════════════════════════════════════════════════════ -->
        <!-- VARIANT B — Table View                              -->
        <!-- ════════════════════════════════════════════════════ -->
        @if (variant() === 'B') {
          <!-- Status filter tabs -->
          <div class="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            @for (tab of statusTabs; track tab.key) {
              <button
                class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
                [class]="tableFilter() === tab.key
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
                (click)="setTableFilter(tab.key)"
              >
                {{ tab.label }}
                <span
                  class="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium"
                  [class]="tableFilter() === tab.key
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-gray-100 text-gray-600'"
                >{{ tab.count() }}</span>
              </button>
            }
          </div>

          <!-- Table -->
          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50">
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Question</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Category</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600 text-right">Prob.</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Outcome</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600 text-right">Brier</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Deadline</th>
                    <th scope="col" class="px-4 py-3 font-medium text-gray-600">Updated</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (pred of filteredPredictions(); track pred.id) {
                    <tr class="group transition-colors hover:bg-gray-50">
                      <td class="relative px-4 py-3">
                        <div
                          class="absolute inset-y-0 left-0 w-1"
                          [class]="outcomeBorderClass(pred.outcome)"
                        ></div>
                        <a
                          [routerLink]="['/questions', pred.questionId]"
                          class="line-clamp-1 font-medium text-gray-900 group-hover:text-rose-600"
                        >{{ pred.questionTitle }}</a>
                      </td>
                      <td class="px-4 py-3">
                        <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                      </td>
                      <td class="px-4 py-3 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <div class="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200">
                            <div
                              class="h-full rounded-full bg-rose-400"
                              [style.width.%]="pred.probability * 100"
                            ></div>
                          </div>
                          <span class="font-bold text-gray-900">{{ (pred.probability * 100).toFixed(0) }}%</span>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <app-badge
                          [text]="statusLabels[pred.status]"
                          [colorClass]="statusColors[pred.status]"
                        />
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex items-center gap-1 text-xs font-medium"
                          [class]="outcomeTextClass(pred.outcome)"
                        >
                          @if (pred.outcome === 'correct') {
                            <app-icon name="check-circle" class="h-3.5 w-3.5" />
                          } @else if (pred.outcome === 'incorrect') {
                            <app-icon name="x" class="h-3.5 w-3.5" />
                          } @else if (pred.outcome === 'cancelled') {
                            <app-icon name="circle" class="h-3.5 w-3.5" />
                          } @else {
                            <app-icon name="clock" class="h-3.5 w-3.5" />
                          }
                          {{ outcomeLabel(pred.outcome) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-xs text-gray-700">
                        {{ pred.brierScore !== null ? pred.brierScore.toFixed(3) : '--' }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{{ formatDate(pred.deadline) }}</td>
                      <td class="whitespace-nowrap px-4 py-3 text-xs text-gray-400">{{ formatDate(pred.updatedAt) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="8" class="px-4 py-12 text-center">
                        <app-icon name="inbox" class="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p class="text-sm text-gray-500">No predictions match this filter</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ════════════════════════════════════════════════════ -->
        <!-- VARIANT C — Timeline View                           -->
        <!-- ════════════════════════════════════════════════════ -->
        @if (variant() === 'C') {
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

          <!-- Timeline -->
          <div class="relative">
            <!-- Timeline vertical line -->
            <div class="absolute left-[7.5rem] top-0 bottom-0 w-px bg-gray-200"></div>

            @for (pred of timelinePredictions(); track pred.id) {
              <div class="group relative mb-6 flex items-start gap-6">
                <!-- Date column -->
                <div class="w-24 shrink-0 pt-3 text-right">
                  <p class="text-sm font-medium text-gray-700">{{ formatDateShort(pred.updatedAt) }}</p>
                  <p class="text-xs text-gray-400">{{ formatTime(pred.updatedAt) }}</p>
                </div>

                <!-- Timeline dot -->
                <div class="relative z-10 mt-3.5 flex shrink-0 items-center justify-center">
                  <div
                    class="h-3 w-3 rounded-full ring-4 ring-white"
                    [class]="timelineDotColor(pred.outcome)"
                  ></div>
                </div>

                <!-- Card -->
                <a
                  [routerLink]="['/questions', pred.questionId]"
                  class="flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
                >
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <h3 class="line-clamp-1 text-sm font-medium text-gray-900 group-hover:text-rose-600">
                      {{ pred.questionTitle }}
                    </h3>
                    <div class="flex shrink-0 items-center gap-2">
                      <app-badge [text]="pred.category" colorClass="bg-gray-100 text-gray-700" />
                      <app-badge
                        [text]="statusLabels[pred.status]"
                        [colorClass]="statusColors[pred.status]"
                      />
                    </div>
                  </div>

                  <div class="flex items-center gap-6">
                    <!-- Probability bar -->
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500">Probability:</span>
                      <div class="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          class="h-full rounded-full bg-rose-400"
                          [style.width.%]="pred.probability * 100"
                        ></div>
                      </div>
                      <span class="text-sm font-bold text-gray-900">{{ (pred.probability * 100).toFixed(0) }}%</span>
                    </div>

                    <!-- Brier score -->
                    @if (pred.brierScore !== null) {
                      <div class="flex items-center gap-1 text-xs">
                        @if (pred.outcome === 'correct') {
                          <app-icon name="trending-up" class="h-3 w-3 text-emerald-600" />
                          <span class="font-medium text-emerald-700">Brier: {{ pred.brierScore.toFixed(3) }}</span>
                        } @else {
                          <app-icon name="trending-down" class="h-3 w-3 text-red-600" />
                          <span class="font-medium text-red-700">Brier: {{ pred.brierScore.toFixed(3) }}</span>
                        }
                      </div>
                    }

                    <!-- Deadline -->
                    <div class="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <app-icon name="calendar-days" class="h-3 w-3" />
                      Deadline: {{ formatDate(pred.deadline) }}
                    </div>
                  </div>
                </a>
              </div>
            }

            @if (timelinePredictions().length === 0) {
              <div class="ml-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-12">
                <app-icon name="inbox" class="mb-3 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">No predictions to display</p>
              </div>
            }
          </div>
        }

      </div>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-4 right-4 z-50 flex gap-1 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg">
      <span class="mr-1 opacity-60">Variant:</span>
      @for (v of ['A', 'B', 'C']; track v) {
        <button class="rounded px-2 py-1" [class]="variant() === v ? 'bg-rose-600' : 'hover:bg-gray-700'"
          (click)="setVariant(v)">{{ v }}</button>
      }
    </div>
  `,
})
export class MyPredictionsComponent {
  // ── Constants ──
  readonly statusLabels = QUESTION_STATUS_LABELS
  readonly statusColors = QUESTION_STATUS_COLORS

  // ── Variant switcher ──
  private readonly VARIANT_KEY = 'design-variant-my-predictions'
  variant = signal<string>(localStorage.getItem(this.VARIANT_KEY) ?? 'A')

  setVariant(v: string) {
    this.variant.set(v)
    localStorage.setItem(this.VARIANT_KEY, v)
  }

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

  // ── Variant B: Table filter ──
  tableFilter = signal<string>('all')

  readonly statusTabs = [
    { key: 'all', label: 'All', count: computed(() => this.predictions().length) },
    { key: 'open', label: 'Open', count: computed(() => this.openPredictions().length) },
    { key: 'correct', label: 'Correct', count: computed(() => this.correctPredictions().length) },
    { key: 'incorrect', label: 'Incorrect', count: computed(() => this.incorrectPredictions().length) },
    { key: 'cancelled', label: 'Cancelled', count: computed(() => this.cancelledPredictions().length) },
  ]

  setTableFilter(key: string) {
    this.tableFilter.set(key)
  }

  filteredPredictions = computed(() => {
    const filter = this.tableFilter()
    if (filter === 'all') return this.predictions()
    if (filter === 'open') return this.openPredictions()
    if (filter === 'correct') return this.correctPredictions()
    if (filter === 'incorrect') return this.incorrectPredictions()
    if (filter === 'cancelled') return this.cancelledPredictions()
    return this.predictions()
  })

  // ── Variant C: Timeline (sorted by most recent update) ──
  timelinePredictions = computed(() =>
    [...this.predictions()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  )

  // ── Helpers ──
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  formatDateShort(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  formatTime(_date: Date | string): string {
    // Mock: just show a static time since mock data only has dates
    return 'Updated'
  }

  outcomeBorderClass(outcome: string): string {
    switch (outcome) {
      case 'pending': return 'bg-blue-500'
      case 'correct': return 'bg-emerald-500'
      case 'incorrect': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-400'
      default: return 'bg-gray-300'
    }
  }

  outcomeTextClass(outcome: string): string {
    switch (outcome) {
      case 'pending': return 'text-blue-600'
      case 'correct': return 'text-emerald-600'
      case 'incorrect': return 'text-red-600'
      case 'cancelled': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  outcomeLabel(outcome: string): string {
    switch (outcome) {
      case 'pending': return 'Pending'
      case 'correct': return 'Correct'
      case 'incorrect': return 'Incorrect'
      case 'cancelled': return 'Cancelled'
      default: return outcome
    }
  }

  timelineDotColor(outcome: string): string {
    switch (outcome) {
      case 'pending': return 'bg-blue-500'
      case 'correct': return 'bg-emerald-500'
      case 'incorrect': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-400'
      default: return 'bg-gray-300'
    }
  }
}
