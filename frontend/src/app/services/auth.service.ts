import { Injectable, inject, signal } from '@angular/core'
import { OidcSecurityService } from 'angular-auth-oidc-client'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService)

  private readonly _isAuthenticated = signal(false)
  private readonly _isLoading = signal(true)
  private accessToken = ''

  readonly isAuthenticated = this._isAuthenticated.asReadonly()
  readonly isLoading = this._isLoading.asReadonly()

  init(): void {
    this.oidc.checkAuth().subscribe(({ isAuthenticated, accessToken }) => {
      this._isAuthenticated.set(isAuthenticated)
      this.accessToken = accessToken
      this._isLoading.set(false)

      if (!isAuthenticated) {
        this.login()
      }
    })

    this.oidc.getAccessToken().subscribe((token) => {
      if (token) {
        this.accessToken = token
      }
    })
  }

  login(): void {
    this.oidc.authorize()
  }

  logout(): void {
    this.oidc.logoff().subscribe()
  }

  getAccessToken(): string {
    return this.accessToken
  }

  handleRedirectCallback(): void {
    this.oidc.checkAuth().subscribe(({ isAuthenticated, accessToken }) => {
      this._isAuthenticated.set(isAuthenticated)
      this.accessToken = accessToken
      this._isLoading.set(false)
    })
  }
}
