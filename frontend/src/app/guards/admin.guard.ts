import { inject } from '@angular/core'
import type { CanActivateFn } from '@angular/router'
import { Router } from '@angular/router'
import { CurrentUserService } from '@services/current-user.service'

export const adminGuard: CanActivateFn = () => {
  const currentUser = inject(CurrentUserService)
  const router = inject(Router)

  const user = currentUser.user.data()
  if (user?.role === 'admin') {
    return true
  }

  return router.createUrlTree(['/'])
}
