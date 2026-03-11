import { CommonModule } from '@angular/common'
import type { OnDestroy } from '@angular/core'
import {
  Component,
  HostListener,
  input,
  output,
} from '@angular/core'
import { IconButtonComponent } from '@shared/components/buttons/icon-button/icon-button.component'

type ModalSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconButtonComponent],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 p-2 sm:p-4"
        (click)="onBackdropClick($event)"
      >
        <div
          [ngClass]="sizeClasses[size()]"
          class="relative h-auto w-full"
          (click)="$event.stopPropagation()"
        >
          <div
            class="relative flex max-h-[90vh] flex-col rounded-lg bg-white shadow sm:max-h-[85vh]"
          >
            @if (title()) {
              <header
                class="flex shrink-0 items-center justify-between border-b border-stone-300 p-3 sm:p-5"
              >
                <h3 class="text-lg font-semibold text-gray-900 sm:text-xl">
                  {{ title() }}
                </h3>
                @if (showCloseIcon()) {
                  <app-icon-button
                    icon="x"
                    size="md"
                    background="transparent"
                    [ariaLabel]="'Close'"
                    (clicked)="closed.emit()"
                  />
                }
              </header>
            }

            <div
              class="min-h-0 flex-1"
              [ngClass]="title() || hasFooter() ? 'overflow-y-auto p-3 sm:p-5' : ''"
              [style.max-height.px]="maxHeight()"
            >
              <ng-content></ng-content>
            </div>

            @if (hasFooter()) {
              <footer
                class="shrink-0 rounded-b border-t border-stone-300 p-3 sm:p-5"
              >
                <ng-content select="[footer]"></ng-content>
              </footer>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ModalComponent implements OnDestroy {
  isOpen = input.required<boolean>()
  title = input<string | undefined>()
  size = input<ModalSize>('xl')
  closeable = input<boolean>(false)
  hasFooter = input<boolean>(false)
  showCloseIcon = input<boolean>(true)
  maxHeight = input<number | undefined>()
  headerClasses = input<string>('')

  closed = output<void>()
  show = output<void>()
  toggled = output<void>()

  sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.isOpen()) {
      this.closed.emit()
    }
  }

  onBackdropClick(event: MouseEvent): void {
    // Overlay click does NOT dismiss (per CLAUDE.md conventions)
    event.stopPropagation()
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}
