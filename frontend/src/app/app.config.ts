import type { ApplicationConfig } from '@angular/core'
import { provideZonelessChangeDetection } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental'
import { provideAuth, StsConfigLoader } from 'angular-auth-oidc-client'

import { routes } from './app.routes'
import { OidcConfigFactory } from '@services/oidc-config.factory'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    provideAuth({
      loader: {
        provide: StsConfigLoader,
        useFactory: OidcConfigFactory,
        deps: [HttpClient],
      },
    }),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    ),
  ],
}
