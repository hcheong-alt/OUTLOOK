import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import { LoaderComponent } from '@shared/components/loader/loader.component'
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
    LoaderComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Header -->
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
      </div>
    </div>
  `,
})
export class DashboardComponent {
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
