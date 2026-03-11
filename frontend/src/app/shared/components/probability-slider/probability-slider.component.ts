import { Component, model } from '@angular/core'

@Component({
  selector: 'app-probability-slider',
  standalone: true,
  template: `
    <div class="flex items-center gap-4">
      <input
        type="range"
        min="1"
        max="99"
        [value]="value()"
        (input)="onSliderChange($event)"
        class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-red-300 via-yellow-300 to-green-300"
        [style.accent-color]="'var(--accent)'"
      />
      <div class="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max="99"
          [value]="value()"
          (change)="onInputChange($event)"
          class="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30"
        />
        <span class="text-sm text-gray-500">%</span>
      </div>
    </div>
  `,
})
export class ProbabilitySliderComponent {
  value = model.required<number>()

  onSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value)
    this.value.set(Math.max(1, Math.min(99, val)))
  }

  onInputChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value)
    this.value.set(Math.max(1, Math.min(99, val)))
  }
}
