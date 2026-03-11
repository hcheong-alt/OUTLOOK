import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'

import type { TeamCreateInput } from '@models/trpc.models'
import { TrpcService } from './trpc.service'

const TEAM_KEY = ['teams'] as const

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  readonly list = injectQuery(() => ({
    queryKey: [...TEAM_KEY],
    queryFn: () => this.trpc.client.team.list.query(),
  }))

  readonly create = injectMutation(() => ({
    mutationFn: (input: TeamCreateInput) =>
      this.trpc.client.team.create.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...TEAM_KEY] })
    },
  }))
}
