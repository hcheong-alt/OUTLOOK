import { Component, input } from '@angular/core'

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="colorClass()"
    >
      {{ text() }}
    </span>
  `,
})
export class BadgeComponent {
  text = input.required<string>()
  colorClass = input<string>('bg-gray-100 text-gray-800')
}
