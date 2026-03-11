import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'

import type { UserPreferencesInput } from '@models/trpc.models'
import { TrpcService } from './trpc.service'

const USER_QUERY_KEY = ['user', 'current'] as const

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  readonly user = injectQuery(() => ({
    queryKey: [...USER_QUERY_KEY],
    queryFn: () => this.trpc.client.user.get.query(),
  }))

  readonly updatePreferences = injectMutation(() => ({
    mutationFn: (input: UserPreferencesInput) =>
      this.trpc.client.user.updatePreferences.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...USER_QUERY_KEY] })
    },
  }))
}
