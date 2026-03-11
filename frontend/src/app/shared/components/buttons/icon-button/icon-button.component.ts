import { Component, computed, input, output } from '@angular/core'
import type { LucideIconName } from '@shared/components/icon/icon.component'
import { IconComponent } from '@shared/components/icon/icon.component'

export type IconButtonBackground =
  | 'main'
  | 'secondary'
  | 'elevated'
  | 'transparent'

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button
      [class]="buttonClasses()"
      [disabled]="disabled()"
      [attr.data-testid]="testId() || null"
      [attr.aria-label]="ariaLabel() || null"
      [attr.title]="tooltip() || null"
      (click)="clicked.emit()"
    >
      <app-icon [name]="icon()" [class]="iconClasses()" />
    </button>
  `,
})
export class IconButtonComponent {
  icon = input.required<LucideIconName>()
  size = input<'sm' | 'md' | 'lg'>('md')
  background = input<IconButtonBackground>('main')
  disabled = input<boolean>(false)
  focused = input<boolean>(false)
  tooltip = input<string>()
  testId = input<string>()
  ariaLabel = input<string>()

  clicked = output<void>()

  iconClasses = computed(() => {
    const map = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }
    return map[this.size()]
  })

  buttonClasses = computed(() => {
    const sizeMap = {
      sm: 'h-7 w-7',
      md: 'h-8 w-8',
      lg: 'h-10 w-10',
    }

    const bgMap = {
      main: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      elevated:
        'bg-white text-gray-700 shadow-sm hover:bg-gray-50 border border-gray-200',
      transparent: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700',
    }

    const focusedStyle = this.focused()
      ? 'ring-2 ring-accent-400 ring-offset-1'
      : ''

    return `inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${sizeMap[this.size()]} ${bgMap[this.background()]} ${focusedStyle}`
  })
}
