import { Component, input } from '@angular/core'
import { IconComponent } from '@shared/components/icon/icon.component'
import type { LucideIconName } from '@shared/components/icon/icon.component'

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16"
    >
      <app-icon [name]="icon()" class="mb-3 h-10 w-10 text-gray-300" />
      <p class="text-sm text-gray-500">{{ message() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input<LucideIconName>('inbox')
  message = input<string>('No items found')
}
