import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { NavbarComponent } from './navbar.component'

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="flex h-screen flex-col bg-[var(--app-bg)]">
      <app-navbar />
      <main class="flex-1 overflow-hidden">
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {}
