import { Component, inject, signal } from '@angular/core'
import { IconComponent } from '@shared/components/icon/icon.component'
import { CurrentUserService } from '@services/current-user.service'

interface EcosystemApp {
  name: string
  url: string
  accent: string
}

@Component({
  selector: 'app-app-switcher',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (apps.length > 0) {
      <div class="relative">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          (click)="isOpen.set(!isOpen())"
          aria-label="Switch application"
        >
          <app-icon name="layout-dashboard" class="h-4 w-4" />
        </button>

        @if (isOpen()) {
          <div
            class="absolute right-0 top-10 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <div class="px-3 py-2 text-xs font-medium uppercase text-gray-400">
              LACE Ecosystem
            </div>
            @for (app of apps; track app.name) {
              <a
                [href]="app.url"
                class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <div
                  class="h-2 w-2 rounded-full"
                  [style.background-color]="app.accent"
                ></div>
                {{ app.name }}
                <app-icon name="external-link" class="ml-auto h-3 w-3 text-gray-400" />
              </a>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AppSwitcherComponent {
  private readonly _currentUser = inject(CurrentUserService)

  isOpen = signal(false)

  // Configured ecosystem apps (empty = hidden)
  readonly apps: EcosystemApp[] = []
}
