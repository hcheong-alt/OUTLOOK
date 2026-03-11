import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import {
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_COLORS,
} from '@models/enums'
import type { LucideIconName } from '@shared/components/icon/icon.component'

// ── Mock data ──

interface MockResolution {
  id: string
  title: string
  outcome: 'yes' | 'no' | 'ambiguous'
  resolvedAt: Date
  consensus: number
}

interface MockExpiring {
  id: string
  title: string
  deadline: Date
  predictions: number
  consensus: number
  category: string
}

interface SummaryCard {
  label: string
  value: string | number
  icon: LucideIconName
  color: string
  bgColor: string
}

interface ActivityItem {
  id: string
  title: string
  type: 'resolution' | 'expiring'
  date: Date
  outcome?: 'yes' | 'no' | 'ambiguous'
  consensus: number
  predictions?: number
  category?: string
}

const MOCK_RESOLUTIONS: MockResolution[] = [
  { id: 'r1', title: 'Will the ECB cut rates before July 2026?', outcome: 'yes', resolvedAt: new Date('2026-03-08'), consensus: 0.72 },
  { id: 'r2', title: 'Will China announce new Taiwan Strait exercises by Q1 2026?', outcome: 'no', resolvedAt: new Date('2026-03-07'), consensus: 0.38 },
  { id: 'r3', title: 'Will global oil prices exceed $100/barrel in March?', outcome: 'no', resolvedAt: new Date('2026-03-06'), consensus: 0.25 },
  { id: 'r4', title: 'Will the UN Security Council pass the climate resolution?', outcome: 'yes', resolvedAt: new Date('2026-03-05'), consensus: 0.81 },
  { id: 'r5', title: 'Will the bilateral trade deal be signed at the summit?', outcome: 'ambiguous', resolvedAt: new Date('2026-03-04'), consensus: 0.55 },
  { id: 'r6', title: 'Will NATO expand air defense deployments to Finland by March?', outcome: 'yes', resolvedAt: new Date('2026-03-03'), consensus: 0.68 },
]

const MOCK_EXPIRING: MockExpiring[] = [
  { id: 'e1', title: 'Will the Fed raise interest rates by Q2 2026?', deadline: new Date('2026-03-15'), predictions: 12, consensus: 0.65, category: 'Finance' },
  { id: 'e2', title: 'Will the trade negotiations conclude this week?', deadline: new Date('2026-03-16'), predictions: 8, consensus: 0.42, category: 'Diplomacy' },
  { id: 'e3', title: 'Will the ceasefire agreement hold through March?', deadline: new Date('2026-03-18'), predictions: 15, consensus: 0.31, category: 'Security' },
  { id: 'e4', title: 'Will Country X hold elections on schedule?', deadline: new Date('2026-03-20'), predictions: 6, consensus: 0.78, category: 'Politics' },
  { id: 'e5', title: 'Will the semiconductor export ban be expanded?', deadline: new Date('2026-03-22'), predictions: 9, consensus: 0.56, category: 'Technology' },
]

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    IconComponent,
    BadgeComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Header (shared across variants) -->
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-medium text-gray-900">Dashboard</h1>
            <p class="mt-1 text-sm text-gray-500">Forecasting overview and recent activity.</p>
          </div>
          <button
            routerLink="/questions"
            class="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
          >
            <app-icon name="plus" class="h-4 w-4" />
            New Question
          </button>
        </div>

        <!-- ════════════════════════════════════════════ -->
        <!-- Variant A: Current layout (cards + 2/3 + 1/3) -->
        <!-- ════════════════════════════════════════════ -->
        @if (variant() === 'A') {
          <!-- Summary cards -->
          <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (card of summaryCards(); track card.label) {
              <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-500">{{ card.label }}</p>
                    <p class="mt-1 text-3xl font-bold text-gray-900">{{ card.value }}</p>
                  </div>
                  <div class="flex h-12 w-12 items-center justify-center rounded-lg" [class]="card.bgColor">
                    <app-icon [name]="card.icon" [class]="'h-6 w-6 ' + card.color" />
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Two-column layout: Resolutions + Expiring -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

            <!-- Recent resolutions feed (2/3) -->
            <div class="lg:col-span-2">
              <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <h2 class="text-sm font-semibold text-gray-800">Recent Resolutions</h2>
                  <a routerLink="/questions" class="text-xs text-rose-600 hover:underline">View all</a>
                </div>
                <div class="divide-y divide-gray-50">
                  @for (res of recentResolutions; track res.id) {
                    <div class="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                      <div
                        class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        [class]="getOutcomeClasses(res.outcome)"
                      >
                        <app-icon [name]="getOutcomeIcon(res.outcome)" class="h-4 w-4" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <a
                          [routerLink]="['/questions', res.id]"
                          class="text-sm font-medium text-gray-900 hover:text-rose-600 hover:underline"
                        >{{ res.title }}</a>
                        <div class="mt-1 flex items-center gap-3">
                          <app-badge
                            [text]="getOutcomeLabel(res.outcome)"
                            [colorClass]="getOutcomeBadgeColor(res.outcome)"
                          />
                          <span class="text-xs text-gray-400">
                            Consensus: {{ (res.consensus * 100).toFixed(0) }}%
                          </span>
                          <span class="text-xs text-gray-400">
                            {{ formatDate(res.resolvedAt) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Expiring soon (1/3) -->
            <div>
              <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div class="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                  <app-icon name="clock" class="h-4 w-4 text-rose-500" />
                  <h2 class="text-sm font-semibold text-gray-800">Expiring Soon</h2>
                </div>
                <div class="divide-y divide-gray-50">
                  @for (q of expiringSoon; track q.id) {
                    <a
                      [routerLink]="['/questions', q.id]"
                      class="block px-5 py-3 transition-colors hover:bg-gray-50"
                    >
                      <p class="mb-1 line-clamp-2 text-sm font-medium text-gray-900">{{ q.title }}</p>
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-500">
                          <app-icon name="calendar-days" class="mr-1 inline h-3 w-3" />
                          {{ formatDate(q.deadline) }}
                        </span>
                        <span class="text-xs text-gray-500">
                          {{ q.predictions }} predictions
                        </span>
                      </div>
                      <div class="mt-1.5 flex items-center gap-2">
                        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            class="h-full rounded-full bg-rose-400 transition-all"
                            [style.width.%]="q.consensus * 100"
                          ></div>
                        </div>
                        <span class="shrink-0 text-xs font-medium text-gray-600">
                          {{ (q.consensus * 100).toFixed(0) }}%
                        </span>
                      </div>
                    </a>
                  }
                </div>
              </div>
            </div>

          </div>
        }

        <!-- ════════════════════════════════════════════ -->
        <!-- Variant B: Compact Dashboard (single-column, activity feed) -->
        <!-- ════════════════════════════════════════════ -->
        @if (variant() === 'B') {
          <!-- Compact summary strip -->
          <div class="mb-6 flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
            @for (card of summaryCards(); track card.label) {
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg" [class]="card.bgColor">
                  <app-icon [name]="card.icon" [class]="'h-4 w-4 ' + card.color" />
                </div>
                <div>
                  <p class="text-xs text-gray-500">{{ card.label }}</p>
                  <p class="text-lg font-bold text-gray-900">{{ card.value }}</p>
                </div>
              </div>
              @if (!$last) {
                <div class="h-10 w-px bg-gray-200"></div>
              }
            }
          </div>

          <!-- Activity feed (merged resolutions + expiring, sorted by date) -->
          <div class="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 class="text-sm font-semibold text-gray-800">Activity Feed</h2>
              <a routerLink="/questions" class="text-xs text-rose-600 hover:underline">View all questions</a>
            </div>
            <div class="divide-y divide-gray-50">
              @for (item of activityFeed(); track item.id) {
                <div class="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                  <!-- Timeline dot -->
                  <div class="flex flex-col items-center pt-1">
                    @if (item.type === 'resolution') {
                      <div
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        [class]="getOutcomeClasses(item.outcome!)"
                      >
                        <app-icon [name]="getOutcomeIcon(item.outcome!)" class="h-3.5 w-3.5" />
                      </div>
                    } @else {
                      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <app-icon name="clock" class="h-3.5 w-3.5" />
                      </div>
                    }
                  </div>
                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <a
                        [routerLink]="['/questions', item.id]"
                        class="text-sm font-medium text-gray-900 hover:text-rose-600 hover:underline"
                      >{{ item.title }}</a>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-2">
                      @if (item.type === 'resolution') {
                        <app-badge
                          [text]="getOutcomeLabel(item.outcome!)"
                          [colorClass]="getOutcomeBadgeColor(item.outcome!)"
                        />
                      } @else {
                        <app-badge
                          text="Expiring"
                          colorClass="bg-amber-100 text-amber-800"
                        />
                        @if (item.category) {
                          <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{{ item.category }}</span>
                        }
                        <span class="text-xs text-gray-400">{{ item.predictions }} predictions</span>
                      }
                      <span class="text-xs text-gray-400">
                        Consensus: {{ (item.consensus * 100).toFixed(0) }}%
                      </span>
                      <span class="text-xs text-gray-400">{{ formatDate(item.date) }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Calibration chart placeholder -->
          <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <app-icon name="trending-up" class="h-4 w-4 text-rose-500" />
              <h2 class="text-sm font-semibold text-gray-800">Personal Calibration</h2>
            </div>
            <div class="flex h-48 items-center justify-center text-sm text-gray-400">
              <div class="flex flex-col items-center gap-2">
                <app-icon name="bar-chart-3" class="h-10 w-10 text-gray-300" />
                <span>Calibration chart will appear here</span>
                <span class="text-xs">Requires 20+ resolved predictions</span>
              </div>
            </div>
          </div>
        }

        <!-- ════════════════════════════════════════════ -->
        <!-- Variant C: Widget Grid (2x2 equal cards) -->
        <!-- ════════════════════════════════════════════ -->
        @if (variant() === 'C') {
          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">

            <!-- Top-left: Summary stats (stacked) -->
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-rose-100 bg-rose-50/50 px-5 py-3">
                <h2 class="text-sm font-semibold text-gray-800">Overview</h2>
              </div>
              <div class="grid grid-cols-2 gap-px bg-gray-100">
                @for (card of summaryCards(); track card.label) {
                  <div class="flex items-center gap-3 bg-white p-5">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg" [class]="card.bgColor">
                      <app-icon [name]="card.icon" [class]="'h-5 w-5 ' + card.color" />
                    </div>
                    <div>
                      <p class="text-xs text-gray-500">{{ card.label }}</p>
                      <p class="text-2xl font-bold text-gray-900">{{ card.value }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Top-right: Personal calibration mini chart -->
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="border-b border-rose-100 bg-rose-50/50 px-5 py-3">
                <h2 class="text-sm font-semibold text-gray-800">Personal Calibration</h2>
              </div>
              <div class="flex h-[calc(100%-3rem)] min-h-[200px] items-center justify-center p-5">
                <div class="flex flex-col items-center gap-3 text-center">
                  <div class="relative h-24 w-24">
                    <!-- Placeholder ring chart -->
                    <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" stroke-width="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#fb7185" stroke-width="8"
                        stroke-dasharray="251.2" stroke-dashoffset="70.3" stroke-linecap="round" />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="text-lg font-bold text-gray-900">0.18</span>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-700">Brier Score</p>
                    <p class="text-xs text-gray-400">Lower is better --- perfect = 0</p>
                  </div>
                  <div class="flex gap-4 text-xs text-gray-500">
                    <span>Resolved: <strong class="text-gray-700">42</strong></span>
                    <span>Accuracy: <strong class="text-gray-700">72%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom-left: Recent resolutions (scrollable) -->
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-rose-100 bg-rose-50/50 px-5 py-3">
                <h2 class="text-sm font-semibold text-gray-800">Recent Resolutions</h2>
                <a routerLink="/questions" class="text-xs text-rose-600 hover:underline">View all</a>
              </div>
              <div class="max-h-[300px] divide-y divide-gray-50 overflow-y-auto">
                @for (res of recentResolutions; track res.id) {
                  <div class="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                    <div
                      class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      [class]="getOutcomeClasses(res.outcome)"
                    >
                      <app-icon [name]="getOutcomeIcon(res.outcome)" class="h-3.5 w-3.5" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <a
                        [routerLink]="['/questions', res.id]"
                        class="text-sm font-medium text-gray-900 hover:text-rose-600 hover:underline"
                      >{{ res.title }}</a>
                      <div class="mt-1 flex items-center gap-3">
                        <app-badge
                          [text]="getOutcomeLabel(res.outcome)"
                          [colorClass]="getOutcomeBadgeColor(res.outcome)"
                        />
                        <span class="text-xs text-gray-400">
                          {{ (res.consensus * 100).toFixed(0) }}%
                        </span>
                        <span class="text-xs text-gray-400">
                          {{ formatDate(res.resolvedAt) }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Bottom-right: Expiring soon (scrollable) -->
            <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div class="flex items-center gap-2 border-b border-rose-100 bg-rose-50/50 px-5 py-3">
                <app-icon name="clock" class="h-4 w-4 text-rose-500" />
                <h2 class="text-sm font-semibold text-gray-800">Expiring Soon</h2>
              </div>
              <div class="max-h-[300px] divide-y divide-gray-50 overflow-y-auto">
                @for (q of expiringSoon; track q.id) {
                  <a
                    [routerLink]="['/questions', q.id]"
                    class="block px-5 py-3 transition-colors hover:bg-gray-50"
                  >
                    <p class="mb-1 line-clamp-2 text-sm font-medium text-gray-900">{{ q.title }}</p>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-gray-500">
                        <app-icon name="calendar-days" class="mr-1 inline h-3 w-3" />
                        {{ formatDate(q.deadline) }}
                      </span>
                      <span class="text-xs text-gray-500">
                        {{ q.predictions }} predictions
                      </span>
                    </div>
                    <div class="mt-1.5 flex items-center gap-2">
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          class="h-full rounded-full bg-rose-400 transition-all"
                          [style.width.%]="q.consensus * 100"
                        ></div>
                      </div>
                      <span class="shrink-0 text-xs font-medium text-gray-600">
                        {{ (q.consensus * 100).toFixed(0) }}%
                      </span>
                    </div>
                  </a>
                }
              </div>
            </div>

          </div>
        }

      </div>
    </div>

    <!-- Variant switcher (remove before final commit) -->
    <div class="fixed bottom-4 right-4 z-50 flex gap-1 rounded-lg bg-gray-900 p-2 text-xs text-white shadow-lg">
      <span class="mr-1 opacity-60">Variant:</span>
      @for (v of ['A', 'B', 'C']; track v) {
        <button class="rounded px-2 py-1" [class]="variant() === v ? 'bg-rose-600' : 'hover:bg-gray-700'"
          (click)="setVariant(v)">{{ v }}</button>
      }
    </div>
  `,
})
export class DashboardComponent {
  // ── Variant switcher ──
  private readonly VARIANT_KEY = 'design-variant-dashboard'
  variant = signal<string>(localStorage.getItem(this.VARIANT_KEY) ?? 'A')

  setVariant(v: string) {
    this.variant.set(v)
    localStorage.setItem(this.VARIANT_KEY, v)
  }

  // ── Mock data ──
  readonly recentResolutions = MOCK_RESOLUTIONS
  readonly expiringSoon = MOCK_EXPIRING

  summaryCards = computed<SummaryCard[]>(() => [
    {
      label: 'Open Questions',
      value: 24,
      icon: 'clipboard-list',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'My Predictions',
      value: 18,
      icon: 'target',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      label: 'Personal Brier Score',
      value: '0.18',
      icon: 'trending-up',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Team Average Brier',
      value: '0.24',
      icon: 'users',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ])

  // ── Activity feed for Variant B (merged + sorted by date desc) ──
  activityFeed = computed<ActivityItem[]>(() => {
    const resolutions: ActivityItem[] = MOCK_RESOLUTIONS.map(r => ({
      id: r.id,
      title: r.title,
      type: 'resolution' as const,
      date: r.resolvedAt,
      outcome: r.outcome,
      consensus: r.consensus,
    }))

    const expiring: ActivityItem[] = MOCK_EXPIRING.map(e => ({
      id: e.id,
      title: e.title,
      type: 'expiring' as const,
      date: e.deadline,
      consensus: e.consensus,
      predictions: e.predictions,
      category: e.category,
    }))

    return [...resolutions, ...expiring].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )
  })

  // ── Helpers ──
  getOutcomeIcon(outcome: string): LucideIconName {
    const map: Record<string, LucideIconName> = {
      yes: 'check-circle',
      no: 'x',
      ambiguous: 'circle-alert',
    }
    return map[outcome] ?? 'circle'
  }

  getOutcomeClasses(outcome: string): string {
    const map: Record<string, string> = {
      yes: 'bg-green-50 text-green-600',
      no: 'bg-red-50 text-red-600',
      ambiguous: 'bg-gray-100 text-gray-500',
    }
    return map[outcome] ?? 'bg-gray-100 text-gray-500'
  }

  getOutcomeLabel(outcome: string): string {
    const map: Record<string, string> = {
      yes: 'Resolved Yes',
      no: 'Resolved No',
      ambiguous: 'Ambiguous',
    }
    return map[outcome] ?? outcome
  }

  getOutcomeBadgeColor(outcome: string): string {
    const map: Record<string, string> = {
      yes: 'bg-green-100 text-green-800',
      no: 'bg-red-100 text-red-800',
      ambiguous: 'bg-gray-100 text-gray-600',
    }
    return map[outcome] ?? 'bg-gray-100 text-gray-800'
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
}
