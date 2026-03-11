import { Component, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IconComponent } from '@shared/components/icon/icon.component'
import type { LucideIconName } from '@shared/components/icon/icon.component'

// ── Mock data ──

interface LeaderboardEntry {
  rank: number
  analyst: string
  brierScore: number
  predictions: number
  accuracyRate: number
  trend: 'up' | 'down' | 'stable'
}

type PeriodFilter = 'all' | 'quarter' | 'month'

const MOCK_LEADERBOARD_ALL: LeaderboardEntry[] = [
  { rank: 1, analyst: 'Sarah Chen', brierScore: 0.112, predictions: 42, accuracyRate: 0.81, trend: 'up' },
  { rank: 2, analyst: 'David Okonkwo', brierScore: 0.134, predictions: 38, accuracyRate: 0.76, trend: 'up' },
  { rank: 3, analyst: 'Priya Sharma', brierScore: 0.148, predictions: 35, accuracyRate: 0.74, trend: 'stable' },
  { rank: 4, analyst: 'James Rodriguez', brierScore: 0.156, predictions: 44, accuracyRate: 0.72, trend: 'down' },
  { rank: 5, analyst: 'Yuki Tanaka', brierScore: 0.167, predictions: 31, accuracyRate: 0.71, trend: 'up' },
  { rank: 6, analyst: 'Marcus Johnson', brierScore: 0.178, predictions: 29, accuracyRate: 0.69, trend: 'stable' },
  { rank: 7, analyst: 'Fatima Al-Rashid', brierScore: 0.189, predictions: 40, accuracyRate: 0.67, trend: 'down' },
  { rank: 8, analyst: 'Thomas Mueller', brierScore: 0.195, predictions: 33, accuracyRate: 0.66, trend: 'up' },
  { rank: 9, analyst: 'Aisha Patel', brierScore: 0.201, predictions: 36, accuracyRate: 0.64, trend: 'down' },
  { rank: 10, analyst: 'Wei Zhang', brierScore: 0.212, predictions: 27, accuracyRate: 0.63, trend: 'stable' },
  { rank: 11, analyst: 'Carlos Mendez', brierScore: 0.223, predictions: 25, accuracyRate: 0.62, trend: 'up' },
  { rank: 12, analyst: 'Elena Volkov', brierScore: 0.234, predictions: 30, accuracyRate: 0.60, trend: 'down' },
  { rank: 13, analyst: 'Alex Kim', brierScore: 0.241, predictions: 22, accuracyRate: 0.59, trend: 'stable' },
  { rank: 14, analyst: 'Olivia Brown', brierScore: 0.255, predictions: 28, accuracyRate: 0.57, trend: 'down' },
  { rank: 15, analyst: 'Daniel Levy', brierScore: 0.268, predictions: 20, accuracyRate: 0.55, trend: 'up' },
]

const MOCK_LEADERBOARD_QUARTER: LeaderboardEntry[] = [
  { rank: 1, analyst: 'David Okonkwo', brierScore: 0.098, predictions: 14, accuracyRate: 0.86, trend: 'up' },
  { rank: 2, analyst: 'Sarah Chen', brierScore: 0.105, predictions: 16, accuracyRate: 0.83, trend: 'stable' },
  { rank: 3, analyst: 'Yuki Tanaka', brierScore: 0.121, predictions: 12, accuracyRate: 0.79, trend: 'up' },
  { rank: 4, analyst: 'Thomas Mueller', brierScore: 0.138, predictions: 11, accuracyRate: 0.75, trend: 'up' },
  { rank: 5, analyst: 'Priya Sharma', brierScore: 0.142, predictions: 13, accuracyRate: 0.74, trend: 'down' },
  { rank: 6, analyst: 'Marcus Johnson', brierScore: 0.155, predictions: 10, accuracyRate: 0.72, trend: 'up' },
  { rank: 7, analyst: 'James Rodriguez', brierScore: 0.168, predictions: 15, accuracyRate: 0.70, trend: 'down' },
  { rank: 8, analyst: 'Carlos Mendez', brierScore: 0.175, predictions: 9, accuracyRate: 0.68, trend: 'up' },
  { rank: 9, analyst: 'Fatima Al-Rashid', brierScore: 0.182, predictions: 14, accuracyRate: 0.66, trend: 'stable' },
  { rank: 10, analyst: 'Wei Zhang', brierScore: 0.198, predictions: 8, accuracyRate: 0.64, trend: 'down' },
]

const MOCK_LEADERBOARD_MONTH: LeaderboardEntry[] = [
  { rank: 1, analyst: 'Yuki Tanaka', brierScore: 0.082, predictions: 5, accuracyRate: 0.90, trend: 'up' },
  { rank: 2, analyst: 'David Okonkwo', brierScore: 0.091, predictions: 6, accuracyRate: 0.88, trend: 'up' },
  { rank: 3, analyst: 'Sarah Chen', brierScore: 0.098, predictions: 7, accuracyRate: 0.85, trend: 'stable' },
  { rank: 4, analyst: 'Carlos Mendez', brierScore: 0.115, predictions: 4, accuracyRate: 0.80, trend: 'up' },
  { rank: 5, analyst: 'Thomas Mueller', brierScore: 0.128, predictions: 5, accuracyRate: 0.78, trend: 'up' },
  { rank: 6, analyst: 'Marcus Johnson', brierScore: 0.142, predictions: 4, accuracyRate: 0.74, trend: 'stable' },
  { rank: 7, analyst: 'James Rodriguez', brierScore: 0.155, predictions: 6, accuracyRate: 0.72, trend: 'down' },
  { rank: 8, analyst: 'Priya Sharma', brierScore: 0.168, predictions: 5, accuracyRate: 0.68, trend: 'down' },
]

@Component({
  selector: 'app-calibration',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- ════════════════════════════════════════════ -->
        <!-- VARIANT A — Original: Chart + Stats + Table -->
        <!-- ════════════════════════════════════════════ -->
        @if (variant() === 'A') {

          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="text-xl font-medium text-gray-900">Calibration & Leaderboard</h1>
              <p class="mt-1 text-sm text-gray-500">Track forecasting accuracy and compare performance across analysts.</p>
            </div>
            <!-- Period filter -->
            <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              @for (option of periodOptions; track option.key) {
                <button
                  class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  [class]="period() === option.key ? 'bg-rose-500 text-white' : 'text-gray-600 hover:bg-gray-100'"
                  (click)="period.set(option.key)"
                >{{ option.label }}</button>
              }
            </div>
          </div>

          <!-- Calibration chart placeholder -->
          <div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-800">Calibration Chart</h2>
              <span class="text-xs text-gray-400">{{ periodLabel() }}</span>
            </div>
            <div class="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <div class="text-center">
                <app-icon name="line-chart" class="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Calibration chart will be rendered here</p>
                <p class="text-xs text-gray-400">
                  X-axis: Predicted probability buckets (0-10%, 10-20%, ... 90-100%)
                </p>
                <p class="text-xs text-gray-400">
                  Y-axis: Actual resolution rate
                </p>
                <p class="mt-2 text-xs text-gray-400">Chart.js integration planned</p>
              </div>
            </div>
          </div>

          <!-- Summary stats row -->
          <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Your Rank</p>
              <p class="mt-1 text-3xl font-bold text-gray-900">#{{ myRank() }}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Your Brier Score</p>
              <p class="mt-1 text-3xl font-bold text-rose-600">{{ myBrier() }}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Total Analysts</p>
              <p class="mt-1 text-3xl font-bold text-gray-900">{{ leaderboard().length }}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p class="text-sm text-gray-500">Team Average Brier</p>
              <p class="mt-1 text-3xl font-bold text-gray-900">{{ teamAvgBrier() }}</p>
            </div>
          </div>

          <!-- Leaderboard table -->
          <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th scope="col" class="w-16 px-4 py-3 font-medium text-gray-600">Rank</th>
                  <th scope="col" class="px-4 py-3 font-medium text-gray-600">Analyst</th>
                  <th scope="col" class="px-4 py-3 font-medium text-gray-600">Brier Score</th>
                  <th scope="col" class="px-4 py-3 font-medium text-gray-600"># Predictions</th>
                  <th scope="col" class="px-4 py-3 font-medium text-gray-600">Accuracy Rate</th>
                  <th scope="col" class="w-20 px-4 py-3 font-medium text-gray-600">Trend</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of leaderboard(); track entry.rank) {
                  <tr
                    class="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    [class.bg-rose-50]="entry.analyst === 'Sarah Chen'"
                  >
                    <td class="px-4 py-3">
                      @if (entry.rank <= 3) {
                        <span
                          class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                          [class]="getRankColor(entry.rank)"
                        >{{ entry.rank }}</span>
                      } @else {
                        <span class="pl-1 text-gray-600">{{ entry.rank }}</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-medium text-rose-600">
                          {{ getInitials(entry.analyst) }}
                        </div>
                        <span class="font-medium text-gray-900" [class.text-rose-700]="entry.analyst === 'Sarah Chen'">
                          {{ entry.analyst }}
                          @if (entry.analyst === 'Sarah Chen') {
                            <span class="ml-1 text-xs text-rose-500">(You)</span>
                          }
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                          <div
                            class="h-full rounded-full transition-all"
                            [class]="getBrierBarColor(entry.brierScore)"
                            [style.width.%]="(1 - entry.brierScore) * 100"
                          ></div>
                        </div>
                        <span class="font-medium text-gray-900">{{ entry.brierScore.toFixed(3) }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600">{{ entry.predictions }}</td>
                    <td class="px-4 py-3">
                      <span class="font-medium" [class]="getAccuracyColor(entry.accuracyRate)">
                        {{ (entry.accuracyRate * 100).toFixed(0) }}%
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1" [class]="getTrendColor(entry.trend)">
                        <app-icon [name]="getTrendIcon(entry.trend)" class="h-4 w-4" />
                        <span class="text-xs font-medium capitalize">{{ entry.trend }}</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

        }

        <!-- ═══════════════════════════════════════════════ -->
        <!-- VARIANT B — Split View: Chart left, Table right -->
        <!-- ═══════════════════════════════════════════════ -->
        @if (variant() === 'B') {

          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="text-xl font-medium text-gray-900">Calibration & Leaderboard</h1>
              <p class="mt-1 text-sm text-gray-500">Track forecasting accuracy and compare performance across analysts.</p>
            </div>
          </div>

          <!-- Period filter pills -->
          <div class="mb-5 flex items-center gap-2">
            @for (option of periodOptions; track option.key) {
              <button
                class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                [class]="period() === option.key ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                (click)="period.set(option.key)"
              >{{ option.label }}</button>
            }
            <span class="ml-auto text-xs text-gray-400">{{ periodLabel() }}</span>
          </div>

          <!-- Summary stats bar -->
          <div class="mb-5 grid grid-cols-4 gap-3">
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                <app-icon name="hash" class="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <p class="text-xs text-gray-500">Your Rank</p>
                <p class="text-lg font-bold text-gray-900">#{{ myRank() }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                <app-icon name="target" class="h-4 w-4 text-rose-500" />
              </div>
              <div>
                <p class="text-xs text-gray-500">Your Brier Score</p>
                <p class="text-lg font-bold text-rose-600">{{ myBrier() }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <app-icon name="users" class="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p class="text-xs text-gray-500">Total Analysts</p>
                <p class="text-lg font-bold text-gray-900">{{ leaderboard().length }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <app-icon name="bar-chart-3" class="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p class="text-xs text-gray-500">Team Avg Brier</p>
                <p class="text-lg font-bold text-gray-900">{{ teamAvgBrier() }}</p>
              </div>
            </div>
          </div>

          <!-- Two-column split -->
          <div class="grid grid-cols-2 gap-5">

            <!-- Left: Calibration chart -->
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-gray-800">Calibration Chart</h2>
                <div class="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
                  @for (scope of chartScopes; track scope) {
                    <button
                      class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
                      [class]="chartScope() === scope ? 'bg-rose-500 text-white' : 'text-gray-500 hover:bg-gray-100'"
                      (click)="chartScope.set(scope)"
                    >{{ scope }}</button>
                  }
                </div>
              </div>
              <div class="flex h-80 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div class="text-center">
                  <app-icon name="line-chart" class="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  <p class="text-sm text-gray-500">Calibration chart will be rendered here</p>
                  <p class="mt-1 text-xs text-gray-400">Scope: {{ chartScope() }}</p>
                  <p class="text-xs text-gray-400">
                    X-axis: Predicted probability buckets
                  </p>
                  <p class="text-xs text-gray-400">
                    Y-axis: Actual resolution rate
                  </p>
                  <p class="mt-2 text-xs text-gray-400">Chart.js integration planned</p>
                </div>
              </div>
            </div>

            <!-- Right: Compact leaderboard -->
            <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 class="text-sm font-semibold text-gray-800">Leaderboard</h2>
              </div>
              <div class="max-h-[420px] overflow-y-auto">
                <table class="w-full text-left text-sm">
                  <thead class="sticky top-0 border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th scope="col" class="w-12 px-3 py-2 text-xs font-medium text-gray-500">#</th>
                      <th scope="col" class="px-3 py-2 text-xs font-medium text-gray-500">Analyst</th>
                      <th scope="col" class="px-3 py-2 text-xs font-medium text-gray-500">Brier</th>
                      <th scope="col" class="px-3 py-2 text-xs font-medium text-gray-500">Acc.</th>
                      <th scope="col" class="w-12 px-3 py-2 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (entry of leaderboard(); track entry.rank) {
                      <tr
                        class="border-b border-gray-50 transition-colors hover:bg-gray-50"
                        [class.bg-rose-50]="entry.analyst === 'Sarah Chen'"
                      >
                        <td class="px-3 py-2">
                          @if (entry.rank <= 3) {
                            <span
                              class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              [class]="getRankColor(entry.rank)"
                            >{{ entry.rank }}</span>
                          } @else {
                            <span class="pl-0.5 text-xs text-gray-500">{{ entry.rank }}</span>
                          }
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-1.5">
                            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-[10px] font-medium text-rose-600">
                              {{ getInitials(entry.analyst) }}
                            </div>
                            <span class="text-xs font-medium text-gray-900" [class.text-rose-700]="entry.analyst === 'Sarah Chen'">
                              {{ entry.analyst }}
                              @if (entry.analyst === 'Sarah Chen') {
                                <span class="text-[10px] text-rose-500"> (You)</span>
                              }
                            </span>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-xs font-medium text-gray-900">{{ entry.brierScore.toFixed(3) }}</td>
                        <td class="px-3 py-2">
                          <span class="text-xs font-medium" [class]="getAccuracyColor(entry.accuracyRate)">
                            {{ (entry.accuracyRate * 100).toFixed(0) }}%
                          </span>
                        </td>
                        <td class="px-3 py-2">
                          <app-icon [name]="getTrendIcon(entry.trend)" class="h-3.5 w-3.5" [class]="getTrendColor(entry.trend)" />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        }

        <!-- ══════════════════════════════════════════════════ -->
        <!-- VARIANT C — Analyst Profile Cards + Podium layout -->
        <!-- ══════════════════════════════════════════════════ -->
        @if (variant() === 'C') {

          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="text-xl font-medium text-gray-900">Calibration & Leaderboard</h1>
              <p class="mt-1 text-sm text-gray-500">Track forecasting accuracy and compare performance across analysts.</p>
            </div>
            <!-- Period filter -->
            <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              @for (option of periodOptions; track option.key) {
                <button
                  class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  [class]="period() === option.key ? 'bg-rose-500 text-white' : 'text-gray-600 hover:bg-gray-100'"
                  (click)="period.set(option.key)"
                >{{ option.label }}</button>
              }
            </div>
          </div>

          <!-- Podium: Top 3 analysts -->
          <div class="mb-8 grid grid-cols-3 gap-4">
            @for (entry of podiumEntries(); track entry.rank) {
              <div
                class="relative flex flex-col items-center rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                [class]="entry.rank === 1 ? 'border-amber-200 bg-gradient-to-b from-amber-50/50 to-white' : 'border-gray-200'"
              >
                <!-- Medal icon -->
                <div
                  class="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg"
                  [class]="getMedalStyle(entry.rank)"
                >
                  @if (entry.rank === 1) {
                    <span class="text-xl">&#x1F947;</span>
                  } @else if (entry.rank === 2) {
                    <span class="text-xl">&#x1F948;</span>
                  } @else {
                    <span class="text-xl">&#x1F949;</span>
                  }
                </div>

                <!-- Avatar -->
                <div
                  class="mb-2 flex items-center justify-center rounded-full text-sm font-semibold"
                  [class]="entry.rank === 1 ? 'h-14 w-14 bg-rose-100 text-rose-700 ring-2 ring-amber-300 ring-offset-2' : 'h-12 w-12 bg-rose-50 text-rose-600'"
                >
                  {{ getInitials(entry.analyst) }}
                </div>

                <!-- Name -->
                <p class="mb-1 text-sm font-semibold text-gray-900">
                  {{ entry.analyst }}
                  @if (entry.analyst === 'Sarah Chen') {
                    <span class="text-xs text-rose-500"> (You)</span>
                  }
                </p>

                <!-- Brier score -->
                <p class="text-2xl font-bold text-rose-600">{{ entry.brierScore.toFixed(3) }}</p>
                <p class="mb-3 text-[10px] uppercase tracking-wider text-gray-400">Brier Score</p>

                <!-- Stats row -->
                <div class="flex w-full items-center justify-center gap-4 border-t border-gray-100 pt-3">
                  <div class="text-center">
                    <p class="text-xs font-bold text-gray-900">{{ entry.predictions }}</p>
                    <p class="text-[10px] text-gray-400">Predictions</p>
                  </div>
                  <div class="text-center">
                    <p class="text-xs font-bold" [class]="getAccuracyColor(entry.accuracyRate)">
                      {{ (entry.accuracyRate * 100).toFixed(0) }}%
                    </p>
                    <p class="text-[10px] text-gray-400">Accuracy</p>
                  </div>
                  <div class="text-center">
                    <div class="flex items-center justify-center gap-0.5" [class]="getTrendColor(entry.trend)">
                      <app-icon [name]="getTrendIcon(entry.trend)" class="h-3 w-3" />
                      <span class="text-[10px] font-medium capitalize">{{ entry.trend }}</span>
                    </div>
                    <p class="text-[10px] text-gray-400">Trend</p>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Calibration chart with zone labels -->
          <div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-800">Calibration Chart</h2>
              <span class="text-xs text-gray-400">{{ periodLabel() }}</span>
            </div>
            <div class="relative flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <!-- Zone labels -->
              <div class="absolute left-4 top-4 rounded bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                Overconfidence Zone
              </div>
              <div class="absolute bottom-4 right-4 rounded bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200">
                Underconfidence Zone
              </div>
              <div class="text-center">
                <app-icon name="line-chart" class="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p class="text-sm text-gray-500">Full calibration chart will be rendered here</p>
                <p class="text-xs text-gray-400">
                  X-axis: Predicted probability buckets (0-10%, 10-20%, ... 90-100%)
                </p>
                <p class="text-xs text-gray-400">
                  Y-axis: Actual resolution rate
                </p>
                <p class="mt-2 text-xs text-gray-400">Chart.js integration planned</p>
              </div>
            </div>
          </div>

          <!-- Remaining analysts compact list with bar charts -->
          @if (remainingEntries().length > 0) {
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-gray-200 px-5 py-3">
                <h2 class="text-sm font-semibold text-gray-800">Other Analysts</h2>
              </div>
              <div class="divide-y divide-gray-100">
                @for (entry of remainingEntries(); track entry.rank) {
                  <div
                    class="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50"
                    [class.bg-rose-50]="entry.analyst === 'Sarah Chen'"
                  >
                    <!-- Rank -->
                    <span class="w-6 text-sm font-medium text-gray-400">{{ entry.rank }}</span>

                    <!-- Avatar + Name -->
                    <div class="flex min-w-[180px] items-center gap-2">
                      <div class="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-xs font-medium text-rose-600">
                        {{ getInitials(entry.analyst) }}
                      </div>
                      <span class="text-sm font-medium text-gray-900" [class.text-rose-700]="entry.analyst === 'Sarah Chen'">
                        {{ entry.analyst }}
                        @if (entry.analyst === 'Sarah Chen') {
                          <span class="text-xs text-rose-500"> (You)</span>
                        }
                      </span>
                    </div>

                    <!-- Brier score bar -->
                    <div class="flex flex-1 items-center gap-3">
                      <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          class="h-full rounded-full transition-all"
                          [class]="getBrierBarColor(entry.brierScore)"
                          [style.width.%]="(1 - entry.brierScore) * 100"
                        ></div>
                      </div>
                      <span class="w-12 text-right text-sm font-semibold text-gray-900">{{ entry.brierScore.toFixed(3) }}</span>
                    </div>

                    <!-- Accuracy -->
                    <span class="w-12 text-right text-sm font-medium" [class]="getAccuracyColor(entry.accuracyRate)">
                      {{ (entry.accuracyRate * 100).toFixed(0) }}%
                    </span>

                    <!-- Trend -->
                    <div class="flex w-8 items-center justify-center" [class]="getTrendColor(entry.trend)">
                      <app-icon [name]="getTrendIcon(entry.trend)" class="h-4 w-4" />
                    </div>
                  </div>
                }
              </div>
            </div>
          }

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
export class CalibrationComponent {
  // ── Design variant state ──
  private readonly VARIANT_KEY = 'design-variant-calibration'
  variant = signal<string>(localStorage.getItem(this.VARIANT_KEY) ?? 'A')

  setVariant(v: string) {
    this.variant.set(v)
    localStorage.setItem(this.VARIANT_KEY, v)
  }

  // ── State ──
  period = signal<PeriodFilter>('all')

  // Variant B: chart scope toggle
  chartScope = signal<string>('Your')
  readonly chartScopes = ['Your', 'Team', 'Organization']

  readonly periodOptions: { key: PeriodFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'month', label: 'This Month' },
  ]

  // ── Computed ──
  leaderboard = computed(() => {
    const p = this.period()
    if (p === 'quarter') return MOCK_LEADERBOARD_QUARTER
    if (p === 'month') return MOCK_LEADERBOARD_MONTH
    return MOCK_LEADERBOARD_ALL
  })

  periodLabel = computed(() => {
    const p = this.period()
    if (p === 'quarter') return 'Q1 2026'
    if (p === 'month') return 'March 2026'
    return 'All Time'
  })

  myRank = computed(() => {
    const entry = this.leaderboard().find((e) => e.analyst === 'Sarah Chen')
    return entry?.rank ?? '--'
  })

  myBrier = computed(() => {
    const entry = this.leaderboard().find((e) => e.analyst === 'Sarah Chen')
    return entry ? entry.brierScore.toFixed(3) : '--'
  })

  teamAvgBrier = computed(() => {
    const entries = this.leaderboard()
    if (entries.length === 0) return '--'
    const avg = entries.reduce((sum, e) => sum + e.brierScore, 0) / entries.length
    return avg.toFixed(3)
  })

  // Variant C: top 3 for podium
  podiumEntries = computed(() => this.leaderboard().slice(0, 3))

  // Variant C: remaining analysts (rank > 3)
  remainingEntries = computed(() => this.leaderboard().slice(3))

  // ── Helpers ──
  getRankColor(rank: number): string {
    if (rank === 1) return 'bg-amber-500'
    if (rank === 2) return 'bg-gray-400'
    if (rank === 3) return 'bg-amber-700'
    return 'bg-gray-200'
  }

  getMedalStyle(rank: number): string {
    if (rank === 1) return 'bg-amber-100'
    if (rank === 2) return 'bg-gray-100'
    return 'bg-orange-50'
  }

  getBrierBarColor(score: number): string {
    if (score < 0.15) return 'bg-emerald-500'
    if (score < 0.2) return 'bg-amber-400'
    return 'bg-red-400'
  }

  getAccuracyColor(rate: number): string {
    if (rate >= 0.75) return 'text-emerald-700'
    if (rate >= 0.6) return 'text-amber-700'
    return 'text-red-700'
  }

  getTrendIcon(trend: string): LucideIconName {
    if (trend === 'up') return 'trending-up'
    if (trend === 'down') return 'trending-down'
    return 'activity'
  }

  getTrendColor(trend: string): string {
    if (trend === 'up') return 'text-emerald-600'
    if (trend === 'down') return 'text-red-500'
    return 'text-gray-400'
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
}
