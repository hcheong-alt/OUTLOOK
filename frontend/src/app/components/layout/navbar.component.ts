import { Component, inject } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { IconComponent } from '@shared/components/icon/icon.component'
import { BadgeComponent } from '@shared/components/badge/badge.component'
import { AuthService } from '@services/auth.service'
import { CurrentUserService } from '@services/current-user.service'
import { AppSwitcherComponent } from './app-switcher.component'
import type { LucideIconName } from '@shared/components/icon/icon.component'

interface NavLink {
  label: string
  path: string
  icon: LucideIconName
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IconComponent,
    BadgeComponent,
    AppSwitcherComponent,
  ],
  template: `
    <nav
      aria-label="Main navigation"
      class="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-6"
    >
      <!-- Left: Wordmark -->
      <a
        routerLink="/"
        class="mr-8 flex items-center gap-2"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400">
          <app-icon name="target" class="h-5 w-5 text-white" />
        </div>
        <span class="font-headline text-lg font-bold tracking-tight text-gray-900">
          OUTLOOK
        </span>
      </a>

      <!-- Center: Nav links -->
      <div class="flex items-center gap-1">
        @for (link of navLinks; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="nav-active"
            [routerLinkActiveOptions]="{ exact: link.path === '/' }"
            class="nav-link relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <app-icon [name]="link.icon" class="h-4 w-4" />
            {{ link.label }}
          </a>
        }
      </div>

      <!-- Right: App switcher, user info, logout -->
      <div class="ml-auto flex items-center gap-3">
        <app-app-switcher />

        @if (currentUserService.user.data(); as user) {
          <div class="flex items-center gap-2">
            <div class="flex flex-col items-end">
              <span class="text-sm font-medium text-gray-900">
                {{ user.displayName }}
              </span>
            </div>
            @if (user.role) {
              <app-badge [text]="user.role" colorClass="bg-rose-100 text-rose-800" />
            }
          </div>
        }

        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          (click)="auth.logout()"
          aria-label="Sign out"
        >
          <app-icon name="log-out" class="h-4 w-4" />
        </button>
      </div>
    </nav>
  `,
  styles: [
    `
      .nav-active {
        color: #111827;
        background-color: #f3f4f6;
      }
      .nav-active::after {
        content: '';
        position: absolute;
        bottom: -9px;
        left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 2px;
        background-color: #fb7185;
        border-radius: 1px;
      }
    `,
  ],
})
export class NavbarComponent {
  readonly auth = inject(AuthService)
  readonly currentUserService = inject(CurrentUserService)

  readonly navLinks: NavLink[] = [
    { label: 'Dashboard', path: '/', icon: 'layout-dashboard' },
    { label: 'Questions', path: '/questions', icon: 'clipboard-list' },
    { label: 'My Predictions', path: '/my-predictions', icon: 'list-todo' },
    { label: 'Calibration', path: '/calibration', icon: 'bar-chart-3' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
  ]
}
