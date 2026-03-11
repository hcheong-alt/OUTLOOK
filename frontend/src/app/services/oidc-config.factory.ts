import type { HttpClient } from '@angular/common/http'
import type { OpenIdConfiguration } from 'angular-auth-oidc-client'
import { LogLevel, StsConfigHttpLoader } from 'angular-auth-oidc-client'
import { map } from 'rxjs'

import { environment } from '../../environments/environment'

export const OidcConfigFactory = (http: HttpClient) => {
  const config$ = http
    .get<{
      result: { data: { json: { sts: { issuer_uri: string; client_id: string; scope?: string } } } }
    }>(`${environment.baseUrl}/trpc/appConfig.get`)
    .pipe(
      map((envelope) => {
        const data = envelope?.result?.data?.json ?? envelope
        const sts = (data as Record<string, unknown>)['sts'] as {
          issuer_uri: string
          client_id: string
          scope?: string
        }

        return {
          authority: sts.issuer_uri,
          redirectUrl: window.location.origin,
          postLogoutRedirectUri: window.location.origin,
          clientId: sts.client_id,
          scope: sts.scope ?? 'openid profile email',
          responseType: 'code',
          silentRenew: true,
          useRefreshToken: true,
          logLevel: environment.production ? LogLevel.Error : LogLevel.Debug,
          secureRoutes: [`${environment.baseUrl}/`],
          autoUserInfo: false,
        } as OpenIdConfiguration
      }),
    )

  return new StsConfigHttpLoader(config$)
}
