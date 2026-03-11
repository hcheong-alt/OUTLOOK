import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app'

bootstrapApplication(AppComponent, appConfig)
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    const errorEl = document.createElement('div')
    errorEl.textContent = 'Application failed to start. Please refresh.'
    errorEl.style.cssText = 'padding:2rem;text-align:center;color:#666;'
    document.body.appendChild(errorEl)
    throw err
  })
