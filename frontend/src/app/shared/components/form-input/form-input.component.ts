import { Component, input, model } from '@angular/core'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label
          [for]="inputId"
          class="text-sm font-medium text-gray-700"
        >
          {{ label() }}
          @if (required()) {
            <span class="text-red-500">*</span>
          }
        </label>
      }
      <input
        [id]="inputId"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [required]="required()"
        [readonly]="readonly()"
        [attr.maxlength]="maxlength() ?? null"
        [attr.minlength]="minlength() ?? null"
        [attr.data-testid]="testId() || null"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        class="rounded-lg border px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        [class]="error()
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
          : 'border-gray-300 focus:border-accent-400 focus:ring-accent-400/30'"
      />
    </div>
  `,
})
export class FormInputComponent {
  value = model<string>('')
  label = input<string>()
  type = input<string>('text')
  placeholder = input<string>('')
  disabled = input<boolean>(false)
  required = input<boolean>(false)
  readonly = input<boolean>(false)
  error = input<boolean>(false)
  testId = input<string>()
  maxlength = input<number | undefined>()
  minlength = input<number | undefined>()

  readonly inputId = `form-input-${Math.random().toString(36).slice(2, 9)}`
}
