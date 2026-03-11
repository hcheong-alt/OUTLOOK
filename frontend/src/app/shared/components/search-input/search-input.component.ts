import type { OnDestroy, OnInit } from '@angular/core'
import { Component, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IconComponent } from '@shared/components/icon/icon.component'

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div
      class="relative flex items-center"
      [class]="widthClasses()"
    >
      @if (showIcon()) {
        <app-icon
          name="search"
          class="pointer-events-none absolute left-3 h-4 w-4 text-gray-400"
        />
      }
      <input
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [attr.aria-label]="ariaLabel() || placeholder()"
        [attr.data-testid]="testId() || null"
        [ngModel]="internalValue()"
        (ngModelChange)="onInput($event)"
        (focus)="focused.emit()"
        (blur)="blurred.emit()"
        class="w-full rounded-lg border border-gray-300 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30"
        [class]="inputClasses()"
      />
      @if (showClear() && internalValue()) {
        <button
          class="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          (click)="onClear()"
          aria-label="Clear search"
        >
          <app-icon name="x" class="h-3.5 w-3.5" />
        </button>
      }
    </div>
  `,
})
export class SearchInputComponent implements OnInit, OnDestroy {
  placeholder = input<string>('Search...')
  value = input<string>('')
  showIcon = input<boolean>(true)
  showClear = input<boolean>(true)
  debounceMs = input<number>(300)
  size = input<'sm' | 'md' | 'lg'>('md')
  width = input<'sm' | 'md' | 'lg' | 'full' | 'auto'>('md')
  disabled = input<boolean>(false)
  ariaLabel = input<string>()
  testId = input<string>()
  tooltip = input<string>()

  searchChange = output<string>()
  inputChange = output<string>()
  focused = output<void>()
  blurred = output<void>()
  cleared = output<void>()

  internalValue = signal('')

  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  ngOnInit(): void {
    this.internalValue.set(this.value())
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  onInput(val: string): void {
    this.internalValue.set(val)
    this.inputChange.emit(val)

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.searchChange.emit(val)
    }, this.debounceMs())
  }

  onClear(): void {
    this.internalValue.set('')
    this.inputChange.emit('')
    this.searchChange.emit('')
    this.cleared.emit()
  }

  inputClasses(): string {
    const sizeMap = {
      sm: 'py-1.5 text-xs',
      md: 'py-2 text-sm',
      lg: 'py-2.5 text-base',
    }
    const paddingLeft = this.showIcon() ? 'pl-10' : 'pl-3'
    const paddingRight = this.showClear() ? 'pr-8' : 'pr-3'
    return `${sizeMap[this.size()]} ${paddingLeft} ${paddingRight}`
  }

  widthClasses(): string {
    const map = {
      sm: 'w-48',
      md: 'w-64',
      lg: 'w-96',
      full: 'w-full',
      auto: 'w-auto',
    }
    return map[this.width()]
  }
}
