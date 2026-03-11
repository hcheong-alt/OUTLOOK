import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { CurrentUserService } from '@services/current-user.service'

export const moderatorGuard: CanActivateFn = () => {
  const currentUser = inject(CurrentUserService)
  const router = inject(Router)

  const user = currentUser.user.data()
  if (user?.role === 'admin' || user?.role === 'moderator') {
    return true
  }

  return router.createUrlTree(['/'])
}
