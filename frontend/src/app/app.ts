import { Component, inject } from '@angular/core'
import { AuthService } from '@services/auth.service'
import { LayoutComponent } from '@components/layout/layout.component'
import { LoaderComponent } from '@shared/components/loader/loader.component'
import { ToastComponent } from '@shared/components/toast/toast.component'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LayoutComponent, LoaderComponent, ToastComponent],
  template: `
    @if (auth.isLoading()) {
      <div class="flex h-screen items-center justify-center">
        <app-loader />
      </div>
    } @else if (auth.isAuthenticated()) {
      <app-layout />
    }
    <app-toast />
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
      }
    `,
  ],
})
export class AppComponent {
  readonly auth = inject(AuthService)

  constructor() {
    this.auth.init()
  }
}
