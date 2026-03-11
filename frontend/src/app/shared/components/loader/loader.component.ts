import { Component } from '@angular/core'

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="flex items-center justify-center p-8">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-accent-400"
      ></div>
    </div>
  `,
})
export class LoaderComponent {}
