import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { toast } from 'ngx-sonner'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import { LoaderComponent } from '@shared/components/loader/loader.component'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent,
    BadgeComponent,
    LoaderComponent,
  ],
  template: `
    <div class="flex h-full w-full flex-col items-center overflow-y-auto px-10 pb-24 pt-8">
      <div class="flex w-full max-w-[800px] flex-col">

        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-xl font-medium text-gray-900">Settings</h1>
          <p class="mt-1 text-sm text-gray-500">Configure your OUTLOOK preferences.</p>
        </div>

        <!-- Dashboard Preferences -->
        <section class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <app-icon name="layout-dashboard" class="h-5 w-5 text-rose-500" />
              <h2 class="text-sm font-semibold text-gray-800">Dashboard Preferences</h2>
            </div>
            <p class="mt-1 text-xs text-gray-500">Customize what appears on your dashboard.</p>
          </div>
          <div class="space-y-4 px-6 py-4">
            <!-- Show expiring questions -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Show expiring questions</p>
                <p class="text-xs text-gray-500">Display questions approaching their deadline</p>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  class="peer sr-only"
                  [ngModel]="showExpiringQuestions()"
                  (ngModelChange)="showExpiringQuestions.set($event)"
                />
                <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300/30"></div>
              </label>
            </div>

            <!-- Show recent resolutions -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Show recent resolutions</p>
                <p class="text-xs text-gray-500">Display recently resolved questions feed</p>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  class="peer sr-only"
                  [ngModel]="showRecentResolutions()"
                  (ngModelChange)="showRecentResolutions.set($event)"
                />
                <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300/30"></div>
              </label>
            </div>

            <!-- Dashboard items per section -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Items per section</p>
                <p class="text-xs text-gray-500">Number of items shown in each dashboard section</p>
              </div>
              <select
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                [ngModel]="dashboardItemCount()"
                (ngModelChange)="dashboardItemCount.set($event)"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Default Visibility -->
        <section class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <app-icon name="eye" class="h-5 w-5 text-rose-500" />
              <h2 class="text-sm font-semibold text-gray-800">Default Visibility</h2>
            </div>
            <p class="mt-1 text-xs text-gray-500">Set default visibility for new questions and predictions.</p>
          </div>
          <div class="space-y-4 px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Default question visibility</p>
                <p class="text-xs text-gray-500">Who can see questions you create</p>
              </div>
              <select
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                [ngModel]="defaultVisibility()"
                (ngModelChange)="defaultVisibility.set($event)"
              >
                <option value="public">Public</option>
                <option value="team">Team Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Show prediction reasoning</p>
                <p class="text-xs text-gray-500">Allow others to see your prediction reasoning by default</p>
              </div>
              <label class="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  class="peer sr-only"
                  [ngModel]="showReasoning()"
                  (ngModelChange)="showReasoning.set($event)"
                />
                <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300/30"></div>
              </label>
            </div>
          </div>
        </section>

        <!-- Chart & Display -->
        <section class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="border-b border-gray-100 px-6 py-4">
            <div class="flex items-center gap-2">
              <app-icon name="bar-chart-3" class="h-5 w-5 text-rose-500" />
              <h2 class="text-sm font-semibold text-gray-800">Chart & Display</h2>
            </div>
            <p class="mt-1 text-xs text-gray-500">Configure chart appearance and scoring display.</p>
          </div>
          <div class="space-y-4 px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Chart style</p>
                <p class="text-xs text-gray-500">Preferred chart rendering style</p>
              </div>
              <select
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                [ngModel]="chartStyle()"
                (ngModelChange)="chartStyle.set($event)"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700">Score display format</p>
                <p class="text-xs text-gray-500">How Brier scores are displayed</p>
              </div>
              <select
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                [ngModel]="scoreFormat()"
                (ngModelChange)="scoreFormat.set($event)"
              >
                <option value="decimal">Decimal (0.123)</option>
                <option value="percentage">Percentage (12.3%)</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Team Management (admin only) -->
        @if (isAdmin()) {
          <section class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-gray-100 px-6 py-4">
              <div class="flex items-center gap-2">
                <app-icon name="users" class="h-5 w-5 text-rose-500" />
                <h2 class="text-sm font-semibold text-gray-800">Team Management</h2>
                <app-badge text="Admin" colorClass="bg-rose-100 text-rose-800" />
              </div>
              <p class="mt-1 text-xs text-gray-500">Manage team members and permissions.</p>
            </div>
            <div class="space-y-4 px-6 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-700">Allow self-registration</p>
                  <p class="text-xs text-gray-500">New users can join without admin approval</p>
                </div>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    [ngModel]="allowSelfRegistration()"
                    (ngModelChange)="allowSelfRegistration.set($event)"
                  />
                  <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300/30"></div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require reasoning</p>
                  <p class="text-xs text-gray-500">Require analysts to provide reasoning with predictions</p>
                </div>
                <label class="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    [ngModel]="requireReasoning()"
                    (ngModelChange)="requireReasoning.set($event)"
                  />
                  <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300/30"></div>
                </label>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-700">Default scoring method</p>
                  <p class="text-xs text-gray-500">Scoring rule used for leaderboard calculations</p>
                </div>
                <select
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                  [ngModel]="scoringMethod()"
                  (ngModelChange)="scoringMethod.set($event)"
                >
                  <option value="brier">Brier Score</option>
                  <option value="log">Log Score</option>
                  <option value="spherical">Spherical Score</option>
                </select>
              </div>

              <!-- Team members list placeholder -->
              <div class="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                <app-icon name="users" class="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p class="text-sm text-gray-500">Team member management</p>
                <p class="text-xs text-gray-400">Invite, remove, and manage analyst roles</p>
                <button
                  class="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                  (click)="onInviteMember()"
                >
                  <app-icon name="user-plus" class="h-4 w-4" />
                  Invite Analyst
                </button>
              </div>
            </div>
          </section>
        }

        <!-- Save button -->
        <div class="flex justify-end">
          <button
            class="rounded-lg bg-rose-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
            (click)="saveSettings()"
          >
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  `,
})
export class SettingsComponent {
  // ── Dashboard preferences ──
  showExpiringQuestions = signal(true)
  showRecentResolutions = signal(true)
  dashboardItemCount = signal('10')

  // ── Default visibility ──
  defaultVisibility = signal<'public' | 'team' | 'private'>('public')
  showReasoning = signal(true)

  // ── Chart & Display ──
  chartStyle = signal<'line' | 'bar' | 'area'>('line')
  scoreFormat = signal<'decimal' | 'percentage'>('decimal')

  // ── Team management (admin only) ──
  isAdmin = signal(true) // Mock: assume current user is admin
  allowSelfRegistration = signal(false)
  requireReasoning = signal(true)
  scoringMethod = signal<'brier' | 'log' | 'spherical'>('brier')

  // ── Actions ──
  saveSettings() {
    // Mock: just show toast
    toast('Settings saved successfully')
  }

  onInviteMember() {
    // Placeholder
    toast('Invite member functionality coming soon')
  }
}
