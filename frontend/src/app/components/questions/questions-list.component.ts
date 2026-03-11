import { Component, computed, HostListener, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { toast } from 'ngx-sonner'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import {
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_COLORS,
} from '@models/enums'
import type { QuestionStatusValue } from '@models/enums'
import type { LucideIconName as _LucideIconName } from '@shared/components/icon/icon.component'

// ── Types ──

interface MockQuestion {
  id: string
  title: string
  category: string
  status: QuestionStatusValue
  deadline: Date
  predictions: number
  consensus: number
  description: string
  resolutionCriteria: string
  visibility: 'public' | 'team' | 'private'
  createdAt: Date
}

type SortColumn = 'title' | 'category' | 'status' | 'deadline' | 'predictions' | 'consensus'
type SortDir = 'asc' | 'desc'

// ── Mock data (28 items) ──

const CATEGORIES = ['Finance', 'Security', 'Politics', 'Diplomacy', 'Technology', 'Climate', 'Military', 'Trade']

const MOCK_QUESTIONS: MockQuestion[] = [
  { id: 'q1', title: 'Will the Fed raise interest rates by Q2 2026?', category: 'Finance', status: 'open', deadline: new Date('2026-06-30'), predictions: 12, consensus: 0.65, description: 'Federal Reserve monetary policy decision.', resolutionCriteria: 'Fed funds rate increases by at least 25bps.', visibility: 'public', createdAt: new Date('2026-01-15') },
  { id: 'q2', title: 'Will the ceasefire hold through April?', category: 'Security', status: 'open', deadline: new Date('2026-04-30'), predictions: 18, consensus: 0.31, description: 'Ongoing ceasefire in the regional conflict.', resolutionCriteria: 'No major military operations reported.', visibility: 'team', createdAt: new Date('2026-02-01') },
  { id: 'q3', title: 'Will Country X hold elections on schedule?', category: 'Politics', status: 'open', deadline: new Date('2026-05-15'), predictions: 9, consensus: 0.78, description: 'National elections scheduled for May.', resolutionCriteria: 'Official election takes place within 7 days of scheduled date.', visibility: 'public', createdAt: new Date('2026-01-20') },
  { id: 'q4', title: 'Will the bilateral trade deal be signed at the summit?', category: 'Diplomacy', status: 'resolved_yes', deadline: new Date('2026-03-01'), predictions: 14, consensus: 0.81, description: 'Trade agreement between two major economies.', resolutionCriteria: 'Both parties sign the agreement.', visibility: 'public', createdAt: new Date('2025-12-10') },
  { id: 'q5', title: 'Will the semiconductor export ban be expanded?', category: 'Technology', status: 'open', deadline: new Date('2026-07-01'), predictions: 7, consensus: 0.56, description: 'Potential expansion of chip export restrictions.', resolutionCriteria: 'New export controls announced covering additional chip categories.', visibility: 'team', createdAt: new Date('2026-02-15') },
  { id: 'q6', title: 'Will global oil prices exceed $100/barrel in Q2?', category: 'Finance', status: 'open', deadline: new Date('2026-06-30'), predictions: 22, consensus: 0.25, description: 'Brent crude price forecast.', resolutionCriteria: 'Brent crude closes above $100 for at least 5 consecutive trading days.', visibility: 'public', createdAt: new Date('2026-01-05') },
  { id: 'q7', title: 'Will the UN Security Council pass the climate resolution?', category: 'Climate', status: 'resolved_yes', deadline: new Date('2026-02-28'), predictions: 11, consensus: 0.68, description: 'Proposed resolution on climate security.', resolutionCriteria: 'Resolution passes without veto.', visibility: 'public', createdAt: new Date('2025-11-20') },
  { id: 'q8', title: 'Will NATO expand air defense deployments to Finland?', category: 'Military', status: 'resolved_no', deadline: new Date('2026-03-01'), predictions: 16, consensus: 0.42, description: 'NATO air defense expansion plans.', resolutionCriteria: 'Formal announcement of new deployments by NATO.', visibility: 'team', createdAt: new Date('2025-12-01') },
  { id: 'q9', title: 'Will the trade negotiations conclude this week?', category: 'Trade', status: 'cancelled', deadline: new Date('2026-03-14'), predictions: 5, consensus: 0.35, description: 'Ongoing trade talks.', resolutionCriteria: 'Official joint statement issued.', visibility: 'private', createdAt: new Date('2026-03-07') },
  { id: 'q10', title: 'Will the ECB cut rates before July 2026?', category: 'Finance', status: 'resolved_yes', deadline: new Date('2026-06-30'), predictions: 20, consensus: 0.72, description: 'European Central Bank rate decision.', resolutionCriteria: 'ECB announces rate cut.', visibility: 'public', createdAt: new Date('2026-01-10') },
  { id: 'q11', title: 'Will the Arctic shipping route see 50% more traffic?', category: 'Climate', status: 'open', deadline: new Date('2026-09-30'), predictions: 4, consensus: 0.38, description: 'Northern Sea Route traffic forecast.', resolutionCriteria: 'Traffic volume exceeds 150% of prior year by end of Q3.', visibility: 'public', createdAt: new Date('2026-02-20') },
  { id: 'q12', title: 'Will the new cybersecurity framework be adopted by G7?', category: 'Technology', status: 'open', deadline: new Date('2026-08-01'), predictions: 6, consensus: 0.61, description: 'Proposed cybersecurity standards.', resolutionCriteria: 'All G7 members formally endorse the framework.', visibility: 'team', createdAt: new Date('2026-01-25') },
  { id: 'q13', title: 'Will the coalition government survive the no-confidence vote?', category: 'Politics', status: 'open', deadline: new Date('2026-04-10'), predictions: 13, consensus: 0.52, description: 'Parliamentary no-confidence motion.', resolutionCriteria: 'Government wins the vote.', visibility: 'public', createdAt: new Date('2026-03-01') },
  { id: 'q14', title: 'Will the humanitarian corridor be established by end of month?', category: 'Security', status: 'open', deadline: new Date('2026-03-31'), predictions: 10, consensus: 0.29, description: 'Proposed humanitarian access route.', resolutionCriteria: 'Corridor operational and aid deliveries commence.', visibility: 'team', createdAt: new Date('2026-03-05') },
  { id: 'q15', title: 'Will the space agency launch the next-gen satellite on schedule?', category: 'Technology', status: 'open', deadline: new Date('2026-05-20'), predictions: 8, consensus: 0.74, description: 'Satellite launch window.', resolutionCriteria: 'Launch occurs within 7 days of scheduled date.', visibility: 'public', createdAt: new Date('2026-02-10') },
  { id: 'q16', title: 'Will the currency depreciate more than 10% this quarter?', category: 'Finance', status: 'open', deadline: new Date('2026-03-31'), predictions: 15, consensus: 0.47, description: 'Emerging market currency forecast.', resolutionCriteria: 'Official exchange rate drops >10% from Jan 1 baseline.', visibility: 'public', createdAt: new Date('2026-01-02') },
  { id: 'q17', title: 'Will the peacekeeping mandate be renewed?', category: 'Diplomacy', status: 'open', deadline: new Date('2026-04-15'), predictions: 7, consensus: 0.83, description: 'UN peacekeeping mission renewal vote.', resolutionCriteria: 'Security Council renews mandate.', visibility: 'team', createdAt: new Date('2026-02-28') },
  { id: 'q18', title: 'Will there be a major ransomware attack on critical infrastructure?', category: 'Technology', status: 'open', deadline: new Date('2026-06-30'), predictions: 11, consensus: 0.41, description: 'Cyber threat assessment.', resolutionCriteria: 'Attack causing >24hr outage to national infrastructure reported.', visibility: 'private', createdAt: new Date('2026-01-18') },
  { id: 'q19', title: 'Will the submarine deal be finalized before the election?', category: 'Military', status: 'open', deadline: new Date('2026-05-01'), predictions: 9, consensus: 0.59, description: 'Defense procurement decision.', resolutionCriteria: 'Contract signed by both parties.', visibility: 'team', createdAt: new Date('2026-02-05') },
  { id: 'q20', title: 'Will the new climate accord achieve 190+ signatories?', category: 'Climate', status: 'open', deadline: new Date('2026-12-31'), predictions: 3, consensus: 0.33, description: 'Global climate agreement participation.', resolutionCriteria: 'At least 190 countries sign by year end.', visibility: 'public', createdAt: new Date('2026-01-30') },
  { id: 'q21', title: 'Will the refugee crisis displace more than 2M people by June?', category: 'Security', status: 'open', deadline: new Date('2026-06-30'), predictions: 14, consensus: 0.62, description: 'Displacement forecast.', resolutionCriteria: 'UNHCR reports >2M displaced from the conflict.', visibility: 'public', createdAt: new Date('2026-02-12') },
  { id: 'q22', title: 'Will the opposition leader be released from detention?', category: 'Politics', status: 'open', deadline: new Date('2026-04-30'), predictions: 6, consensus: 0.21, description: 'Political prisoner case.', resolutionCriteria: 'Official release or house arrest order issued.', visibility: 'team', createdAt: new Date('2026-03-02') },
  { id: 'q23', title: 'Will the rare earth mineral agreement be signed?', category: 'Trade', status: 'open', deadline: new Date('2026-05-15'), predictions: 8, consensus: 0.55, description: 'Critical mineral supply chain agreement.', resolutionCriteria: 'Formal agreement signed.', visibility: 'public', createdAt: new Date('2026-02-18') },
  { id: 'q24', title: 'Will the central bank digital currency launch in the pilot region?', category: 'Finance', status: 'open', deadline: new Date('2026-06-01'), predictions: 10, consensus: 0.69, description: 'CBDC pilot program.', resolutionCriteria: 'Public pilot launch announced.', visibility: 'public', createdAt: new Date('2026-01-22') },
  { id: 'q25', title: 'Will the alliance conduct joint naval exercises in the South China Sea?', category: 'Military', status: 'resolved_no', deadline: new Date('2026-02-28'), predictions: 17, consensus: 0.58, description: 'Planned naval exercises.', resolutionCriteria: 'Exercises completed as planned.', visibility: 'team', createdAt: new Date('2025-12-15') },
  { id: 'q26', title: 'Will the vaccine distribution target of 80% coverage be met?', category: 'Politics', status: 'ambiguous', deadline: new Date('2026-03-01'), predictions: 12, consensus: 0.44, description: 'Public health campaign.', resolutionCriteria: 'Official data shows >80% coverage.', visibility: 'public', createdAt: new Date('2025-11-30') },
  { id: 'q27', title: 'Will the autonomous vehicle regulation framework pass committee?', category: 'Technology', status: 'open', deadline: new Date('2026-07-15'), predictions: 5, consensus: 0.71, description: 'Regulatory review.', resolutionCriteria: 'Committee approves the framework.', visibility: 'public', createdAt: new Date('2026-03-08') },
  { id: 'q28', title: 'Will the border dispute escalate to military mobilization?', category: 'Security', status: 'open', deadline: new Date('2026-04-15'), predictions: 19, consensus: 0.18, description: 'Border tensions monitoring.', resolutionCriteria: 'Either party mobilizes >5000 additional troops to border region.', visibility: 'team', createdAt: new Date('2026-03-09') },
]

@Component({
  selector: 'app-questions-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    BadgeComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[1600px] flex-col">

        <!-- Page header -->
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-medium text-gray-900">Questions</h1>
            <p class="mt-1 text-sm text-gray-500">
              {{ filteredQuestions().length }} questions total
            </p>
          </div>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
            (click)="openCreateModal()"
          >
            <app-icon name="plus" class="h-4 w-4" />
            New Question
          </button>
        </div>

        <!-- Filter bar -->
        <div class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <!-- Search -->
          <div class="relative">
            <app-icon name="search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              class="w-64 rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
              placeholder="Search questions..."
              [ngModel]="filterText()"
              (ngModelChange)="onFilterTextChange($event)"
            />
          </div>

          <!-- Status filter -->
          <select
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
            [ngModel]="filterStatus()"
            (ngModelChange)="onFilterStatusChange($event)"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved_yes">Resolved Yes</option>
            <option value="resolved_no">Resolved No</option>
            <option value="ambiguous">Ambiguous</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <!-- Category filter -->
          <select
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
            [ngModel]="filterCategory()"
            (ngModelChange)="onFilterCategoryChange($event)"
          >
            <option value="">All Categories</option>
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>

          @if (hasActiveFilters()) {
            <button
              class="text-sm text-rose-600 hover:text-rose-700 hover:underline"
              (click)="clearFilters()"
            >Clear filters</button>
          }
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- ═══ VARIANT A — Standard Table Layout ═══ -->
        <!-- ═══════════════════════════════════════════ -->
        @if (variant() === 'A') {
          @if (paginatedQuestions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
              <app-icon name="inbox" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No questions found</p>
              <p class="mt-1 text-xs text-gray-400">Try adjusting your filters or create a new question</p>
            </div>
          } @else {
            <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-gray-200 bg-gray-50">
                  <tr>
                    @for (col of tableColumns; track col.key) {
                      <th
                        scope="col"
                        class="cursor-pointer px-4 py-3 font-medium text-gray-600 hover:text-gray-900"
                        (click)="toggleSort(col.key)"
                      >
                        <div class="flex items-center gap-1">
                          {{ col.label }}
                          @if (sortColumn() === col.key) {
                            <app-icon [name]="sortDir() === 'asc' ? 'arrow-up' : 'arrow-down'" class="h-3.5 w-3.5" />
                          }
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (q of paginatedQuestions(); track q.id) {
                    <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td class="max-w-xs px-4 py-3">
                        <a
                          [routerLink]="['/questions', q.id]"
                          class="font-medium text-gray-900 hover:text-rose-600 hover:underline"
                        >{{ q.title }}</a>
                      </td>
                      <td class="px-4 py-3">
                        <app-badge [text]="q.category" colorClass="bg-gray-100 text-gray-700" />
                      </td>
                      <td class="px-4 py-3">
                        <app-badge [text]="statusLabels[q.status]" [colorClass]="statusColors[q.status]" />
                      </td>
                      <td class="px-4 py-3 text-gray-600">{{ formatDate(q.deadline) }}</td>
                      <td class="px-4 py-3 text-center text-gray-600">{{ q.predictions }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div
                              class="h-full rounded-full bg-rose-400 transition-all"
                              [style.width.%]="q.consensus * 100"
                            ></div>
                          </div>
                          <span class="text-xs text-gray-500">{{ (q.consensus * 100).toFixed(0) }}%</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="mt-4 flex items-center justify-between">
              <p class="text-sm text-gray-500">
                Showing {{ paginationStart() }}-{{ paginationEnd() }} of {{ filteredQuestions().length }}
              </p>
              <div class="flex items-center gap-1">
                <button
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="currentPage() === 1"
                  (click)="currentPage.set(currentPage() - 1)"
                  aria-label="Previous page"
                >
                  <app-icon name="chevron-left" class="h-4 w-4" />
                </button>
                @for (page of pageNumbers(); track page) {
                  <button
                    class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    [class]="page === currentPage() ? 'bg-rose-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'"
                    (click)="currentPage.set(page)"
                  >{{ page }}</button>
                }
                <button
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="currentPage() === totalPages()"
                  (click)="currentPage.set(currentPage() + 1)"
                  aria-label="Next page"
                >
                  <app-icon name="chevron-right" class="h-4 w-4" />
                </button>
              </div>
            </div>
          }
        }

        <!-- ═══════════════════════════════════════ -->
        <!-- ═══ VARIANT B — Card Grid Layout  ═══ -->
        <!-- ═══════════════════════════════════════ -->
        @if (variant() === 'B') {
          @if (paginatedQuestions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
              <app-icon name="inbox" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No questions found</p>
              <p class="mt-1 text-xs text-gray-400">Try adjusting your filters or create a new question</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              @for (q of paginatedQuestions(); track q.id) {
                <a
                  [routerLink]="['/questions', q.id]"
                  class="group flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:border-rose-200 hover:shadow-md"
                  [class]="'border-l-4 ' + kanbanStatusBorderColor(q.status)"
                >
                  <div class="flex flex-1 flex-col p-4">
                    <!-- Title -->
                    <h3 class="mb-2 text-sm font-semibold text-gray-900 group-hover:text-rose-600">
                      {{ q.title }}
                    </h3>

                    <!-- Badges row -->
                    <div class="mb-3 flex flex-wrap items-center gap-2">
                      <app-badge [text]="statusLabels[q.status]" [colorClass]="statusColors[q.status]" />
                      <app-badge [text]="q.category" colorClass="bg-gray-100 text-gray-700" />
                    </div>

                    <!-- Meta grid -->
                    <div class="mt-auto grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div class="flex items-center gap-1">
                        <app-icon name="calendar-days" class="h-3.5 w-3.5 text-gray-400" />
                        {{ formatDate(q.deadline) }}
                      </div>
                      <div class="flex items-center gap-1">
                        <app-icon name="users" class="h-3.5 w-3.5 text-gray-400" />
                        {{ q.predictions }} predictions
                      </div>
                    </div>

                    <!-- Consensus bar -->
                    <div class="mt-3 flex items-center gap-2">
                      <span class="text-xs font-medium text-gray-500">Consensus</span>
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          class="h-full rounded-full bg-rose-400 transition-all"
                          [style.width.%]="q.consensus * 100"
                        ></div>
                      </div>
                      <span class="text-xs font-medium text-gray-600">{{ (q.consensus * 100).toFixed(0) }}%</span>
                    </div>
                  </div>
                </a>
              }
            </div>

            <!-- Pagination -->
            <div class="mt-4 flex items-center justify-between">
              <p class="text-sm text-gray-500">
                Showing {{ paginationStart() }}-{{ paginationEnd() }} of {{ filteredQuestions().length }}
              </p>
              <div class="flex items-center gap-1">
                <button
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="currentPage() === 1"
                  (click)="currentPage.set(currentPage() - 1)"
                  aria-label="Previous page"
                >
                  <app-icon name="chevron-left" class="h-4 w-4" />
                </button>
                @for (page of pageNumbers(); track page) {
                  <button
                    class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    [class]="page === currentPage() ? 'bg-rose-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'"
                    (click)="currentPage.set(page)"
                  >{{ page }}</button>
                }
                <button
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="currentPage() === totalPages()"
                  (click)="currentPage.set(currentPage() + 1)"
                  aria-label="Next page"
                >
                  <app-icon name="chevron-right" class="h-4 w-4" />
                </button>
              </div>
            </div>
          }
        }

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- ═══ VARIANT C — Kanban-inspired Swimlanes    ═══ -->
        <!-- ═══════════════════════════════════════════════════ -->
        @if (variant() === 'C') {
          @if (filteredQuestions().length === 0) {
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
              <app-icon name="inbox" class="mb-3 h-10 w-10 text-gray-300" />
              <p class="text-sm text-gray-500">No questions found</p>
              <p class="mt-1 text-xs text-gray-400">Try adjusting your filters or create a new question</p>
            </div>
          } @else {
            <div class="space-y-6">
              @for (group of kanbanGroups(); track group.status) {
                @if (group.questions.length > 0) {
                  <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <!-- Status header strip -->
                    <div
                      class="flex items-center gap-3 rounded-t-lg border-b px-4 py-3"
                      [class]="kanbanHeaderClass(group.status)"
                    >
                      <span class="text-sm font-semibold">{{ statusLabels[group.status] }}</span>
                      <span class="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {{ group.questions.length }}
                      </span>
                    </div>

                    <!-- Horizontal scrollable cards -->
                    <div class="flex gap-3 overflow-x-auto p-4">
                      @for (q of group.questions; track q.id) {
                        <a
                          [routerLink]="['/questions', q.id]"
                          class="group flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all hover:border-rose-300 hover:bg-white hover:shadow-sm"
                        >
                          <h4 class="mb-2 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-rose-600">
                            {{ q.title }}
                          </h4>
                          <div class="mb-2 flex flex-wrap gap-1.5">
                            <app-badge [text]="q.category" colorClass="bg-gray-100 text-gray-700" />
                          </div>
                          <div class="mt-auto flex items-center justify-between text-xs text-gray-500">
                            <div class="flex items-center gap-1">
                              <app-icon name="calendar-days" class="h-3 w-3" />
                              {{ formatDate(q.deadline) }}
                            </div>
                            <div class="flex items-center gap-1">
                              <app-icon name="users" class="h-3 w-3" />
                              {{ q.predictions }}
                            </div>
                          </div>
                          <!-- Consensus mini bar -->
                          <div class="mt-2 flex items-center gap-2">
                            <div class="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                              <div
                                class="h-full rounded-full bg-rose-400"
                                [style.width.%]="q.consensus * 100"
                              ></div>
                            </div>
                            <span class="text-[10px] font-medium text-gray-500">{{ (q.consensus * 100).toFixed(0) }}%</span>
                          </div>
                        </a>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          }
        }

      </div>
    </div>

    <!-- ═══ Create Question Modal ═══ -->
    @if (isCreateModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4">
        <div class="relative w-full max-w-lg">
          <div class="relative flex max-h-[85vh] flex-col rounded-lg bg-white shadow-xl">
            <!-- Header -->
            <header class="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 class="text-lg font-semibold text-gray-900">New Question</h3>
              <button
                class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                (click)="closeCreateModal()"
                aria-label="Close"
              >
                <app-icon name="x" class="h-5 w-5" />
              </button>
            </header>

            <!-- Body -->
            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div class="space-y-4">
                <!-- Title -->
                <div>
                  <label for="create-title" class="mb-1 block text-sm font-medium text-gray-700">
                    Title <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="create-title"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                    [class.border-red-300]="createSubmitted() && !createForm.title()"
                    placeholder="State the question as a yes/no proposition"
                    [ngModel]="createForm.title()"
                    (ngModelChange)="createForm.title.set($event)"
                    maxlength="500"
                  />
                  @if (createSubmitted() && !createForm.title()) {
                    <p class="mt-1 text-xs text-red-500">Title is required</p>
                  }
                </div>

                <!-- Resolution Criteria -->
                <div>
                  <label for="create-criteria" class="mb-1 block text-sm font-medium text-gray-700">
                    Resolution Criteria <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    id="create-criteria"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                    [class.border-red-300]="createSubmitted() && !createForm.resolutionCriteria()"
                    rows="2"
                    placeholder="How will this question be objectively resolved?"
                    [ngModel]="createForm.resolutionCriteria()"
                    (ngModelChange)="createForm.resolutionCriteria.set($event)"
                    maxlength="2000"
                  ></textarea>
                  @if (createSubmitted() && !createForm.resolutionCriteria()) {
                    <p class="mt-1 text-xs text-red-500">Resolution criteria is required</p>
                  }
                </div>

                <!-- Deadline -->
                <div>
                  <label for="create-deadline" class="mb-1 block text-sm font-medium text-gray-700">
                    Deadline <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="create-deadline"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                    [class.border-red-300]="createSubmitted() && !createForm.deadline()"
                    [ngModel]="createForm.deadline()"
                    (ngModelChange)="createForm.deadline.set($event)"
                  />
                  @if (createSubmitted() && !createForm.deadline()) {
                    <p class="mt-1 text-xs text-red-500">Deadline is required</p>
                  }
                </div>

                <!-- Description -->
                <div>
                  <label for="create-desc" class="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="create-desc"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                    rows="3"
                    placeholder="Background context and relevant information..."
                    [ngModel]="createForm.description()"
                    (ngModelChange)="createForm.description.set($event)"
                    maxlength="5000"
                  ></textarea>
                </div>

                <!-- Category & Visibility row -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="create-category" class="mb-1 block text-sm font-medium text-gray-700">Category</label>
                    <select
                      id="create-category"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                      [ngModel]="createForm.category()"
                      (ngModelChange)="createForm.category.set($event)"
                    >
                      @for (cat of categories; track cat) {
                        <option [value]="cat">{{ cat }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label for="create-visibility" class="mb-1 block text-sm font-medium text-gray-700">Visibility</label>
                    <select
                      id="create-visibility"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                      [ngModel]="createForm.visibility()"
                      (ngModelChange)="createForm.visibility.set($event)"
                    >
                      <option value="public">Public</option>
                      <option value="team">Team Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <footer class="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                (click)="closeCreateModal()"
              >Cancel</button>
              <button
                class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                (click)="submitCreateQuestion()"
              >Create Question</button>
            </footer>
          </div>
        </div>
      </div>
    }

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
export class QuestionsListComponent {
  @HostListener('document:keydown.escape')
  onEscKey() {
    if (this.isCreateModalOpen()) this.closeCreateModal()
  }

  // ── Variant switcher ──
  private readonly VARIANT_KEY = 'design-variant-questions-list'
  variant = signal<string>(localStorage.getItem(this.VARIANT_KEY) ?? 'A')

  setVariant(v: string) {
    this.variant.set(v)
    localStorage.setItem(this.VARIANT_KEY, v)
  }

  // ── Constants ──
  readonly categories = CATEGORIES
  readonly statusLabels = QUESTION_STATUS_LABELS
  readonly statusColors = QUESTION_STATUS_COLORS

  readonly kanbanStatuses: QuestionStatusValue[] = [
    'open', 'resolved_yes', 'resolved_no', 'ambiguous', 'cancelled',
  ]

  readonly tableColumns: { key: SortColumn; label: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'deadline', label: 'Deadline' },
    { key: 'predictions', label: '# Predictions' },
    { key: 'consensus', label: 'Consensus %' },
  ]

  // ── State ──
  private readonly allQuestions = signal<MockQuestion[]>(MOCK_QUESTIONS)
  filterText = signal('')
  filterStatus = signal<QuestionStatusValue | ''>('')
  filterCategory = signal('')
  sortColumn = signal<SortColumn>('deadline')
  sortDir = signal<SortDir>('asc')
  currentPage = signal(1)
  readonly pageSize = 10

  // ── Computed ──
  filteredQuestions = computed(() => {
    let items = [...this.allQuestions()]
    const text = this.filterText().toLowerCase()
    if (text) {
      items = items.filter((q) => q.title.toLowerCase().includes(text))
    }
    const status = this.filterStatus()
    if (status) {
      items = items.filter((q) => q.status === status)
    }
    const category = this.filterCategory()
    if (category) {
      items = items.filter((q) => q.category === category)
    }

    // Sort
    const col = this.sortColumn()
    const dir = this.sortDir()
    items.sort((a, b) => {
      let cmp = 0
      if (col === 'title') cmp = a.title.localeCompare(b.title)
      else if (col === 'category') cmp = a.category.localeCompare(b.category)
      else if (col === 'status') cmp = a.status.localeCompare(b.status)
      else if (col === 'deadline') cmp = a.deadline.getTime() - b.deadline.getTime()
      else if (col === 'predictions') cmp = a.predictions - b.predictions
      else if (col === 'consensus') cmp = a.consensus - b.consensus
      return dir === 'asc' ? cmp : -cmp
    })

    return items
  })

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredQuestions().length / this.pageSize)),
  )

  paginatedQuestions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize
    return this.filteredQuestions().slice(start, start + this.pageSize)
  })

  paginationStart = computed(() =>
    this.filteredQuestions().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1,
  )

  paginationEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredQuestions().length),
  )

  pageNumbers = computed(() => {
    const total = this.totalPages()
    return Array.from({ length: total }, (_, i) => i + 1)
  })

  hasActiveFilters = computed(() =>
    this.filterText() !== '' || this.filterStatus() !== '' || this.filterCategory() !== '',
  )

  // ── Kanban groups (Variant C) ──
  kanbanGroups = computed(() =>
    this.kanbanStatuses.map((status) => ({
      status,
      questions: this.filteredQuestions().filter((q) => q.status === status),
    })),
  )

  kanbanHeaderClass(status: QuestionStatusValue): string {
    const map: Record<QuestionStatusValue, string> = {
      open: 'bg-blue-50 border-blue-200 text-blue-800',
      resolved_yes: 'bg-green-50 border-green-200 text-green-800',
      resolved_no: 'bg-red-50 border-red-200 text-red-800',
      ambiguous: 'bg-gray-50 border-gray-200 text-gray-700',
      cancelled: 'bg-gray-50 border-gray-200 text-gray-500',
    }
    return map[status]
  }

  kanbanStatusBorderColor(status: QuestionStatusValue): string {
    const map: Record<QuestionStatusValue, string> = {
      open: 'border-l-blue-400',
      resolved_yes: 'border-l-green-400',
      resolved_no: 'border-l-red-400',
      ambiguous: 'border-l-gray-400',
      cancelled: 'border-l-gray-300',
    }
    return map[status]
  }

  // ── Filter handlers ──
  onFilterTextChange(text: string) {
    this.filterText.set(text)
    this.currentPage.set(1)
  }

  onFilterStatusChange(status: string) {
    this.filterStatus.set(status as QuestionStatusValue | '')
    this.currentPage.set(1)
  }

  onFilterCategoryChange(category: string) {
    this.filterCategory.set(category)
    this.currentPage.set(1)
  }

  clearFilters() {
    this.filterText.set('')
    this.filterStatus.set('')
    this.filterCategory.set('')
    this.currentPage.set(1)
  }

  // ── Actions ──
  toggleSort(col: SortColumn) {
    if (this.sortColumn() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc')
    } else {
      this.sortColumn.set(col)
      this.sortDir.set('asc')
    }
    this.currentPage.set(1)
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // ── Create modal state ──
  isCreateModalOpen = signal(false)
  createSubmitted = signal(false)
  createForm = {
    title: signal(''),
    resolutionCriteria: signal(''),
    deadline: signal(''),
    description: signal(''),
    category: signal('Finance'),
    visibility: signal<'public' | 'team' | 'private'>('public'),
  }

  openCreateModal() {
    this.isCreateModalOpen.set(true)
    this.createSubmitted.set(false)
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false)
    this.createSubmitted.set(false)
    this.createForm.title.set('')
    this.createForm.resolutionCriteria.set('')
    this.createForm.deadline.set('')
    this.createForm.description.set('')
    this.createForm.category.set('Finance')
    this.createForm.visibility.set('public')
  }

  submitCreateQuestion() {
    this.createSubmitted.set(true)

    const title = this.createForm.title().trim()
    const criteria = this.createForm.resolutionCriteria().trim()
    const deadline = this.createForm.deadline()

    if (!title || !criteria || !deadline) return

    // Mock: add to local list
    const newQuestion: MockQuestion = {
      id: 'q' + (this.allQuestions().length + 1),
      title,
      category: this.createForm.category(),
      status: 'open',
      deadline: new Date(deadline),
      predictions: 0,
      consensus: 0,
      description: this.createForm.description().trim(),
      resolutionCriteria: criteria,
      visibility: this.createForm.visibility(),
      createdAt: new Date(),
    }

    this.allQuestions.set([newQuestion, ...this.allQuestions()])
    toast('Question created successfully')
    this.closeCreateModal()
  }
}
