import { Component, computed, input } from '@angular/core'

@Component({
  selector: 'app-brier-score-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="colorClass()"
    >
      {{ formattedScore() }}
    </span>
  `,
})
export class BrierScoreBadgeComponent {
  score = input.required<number | null>()

  formattedScore = computed(() => {
    const s = this.score()
    if (s === null || s === undefined) return 'N/A'
    return s.toFixed(3)
  })

  colorClass = computed(() => {
    const s = this.score()
    if (s === null || s === undefined) return 'bg-gray-100 text-gray-500'
    if (s <= 0.1) return 'bg-green-100 text-green-800'
    if (s <= 0.2) return 'bg-blue-100 text-blue-800'
    if (s <= 0.25) return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  })
}
