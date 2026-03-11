import { Component, computed, input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { LucideIconName } from '@shared/components/icon/icon.component'
import { IconComponent } from '@shared/components/icon/icon.component'

export type CtaButtonType = 'primary' | 'secondary' | 'tertiary'

@Component({
  selector: 'app-cta-button',
  standalone: true,
  imports: [IconComponent, RouterLink],
  template: `
    @if (routerLink()) {
      <a
        [routerLink]="routerLink()"
        [class]="buttonClasses()"
        [attr.data-testid]="testId() || null"
        [attr.title]="tooltip() || null"
        (click)="clicked.emit()"
      >
        @if (icon() && iconPosition() === 'leading') {
          <app-icon [name]="icon()!" [class]="iconClasses()" />
        }
        <span>{{ text() }}</span>
        @if (icon() && iconPosition() === 'trailing') {
          <app-icon [name]="icon()!" [class]="iconClasses()" />
        }
      </a>
    } @else {
      <button
        [class]="buttonClasses()"
        [attr.data-testid]="testId() || null"
        [attr.title]="tooltip() || null"
        [disabled]="disabled()"
        (click)="clicked.emit()"
      >
        @if (icon() && iconPosition() === 'leading') {
          <app-icon [name]="icon()!" [class]="iconClasses()" />
        }
        <span>{{ text() }}</span>
        @if (icon() && iconPosition() === 'trailing') {
          <app-icon [name]="icon()!" [class]="iconClasses()" />
        }
      </button>
    }
  `,
})
export class CtaButtonComponent {
  text = input.required<string>()
  type = input<CtaButtonType>('secondary')
  role = input<'default' | 'destructive'>('default')
  size = input<'sm' | 'md' | 'lg'>('md')
  icon = input<LucideIconName>()
  iconPosition = input<'leading' | 'trailing'>('leading')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routerLink = input<any[] | string>()
  disabled = input<boolean>(false)
  tooltip = input<string>()
  testId = input<string>('')

  clicked = output<void>()

  iconClasses = computed(() => {
    const map = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }
    return map[this.size()]
  })

  buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

    const sizeMap = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    }

    const isDestructive = this.role() === 'destructive'

    const typeMap = {
      primary: isDestructive
        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
        : 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-400',
      secondary: isDestructive
        ? 'border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500'
        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-accent-400',
      tertiary: isDestructive
        ? 'text-red-600 hover:bg-red-50 focus:ring-red-500'
        : 'text-gray-700 hover:bg-gray-100 focus:ring-accent-400',
    }

    return `${base} ${sizeMap[this.size()]} ${typeMap[this.type()]}`
  })
}
