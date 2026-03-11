import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'

import { TrpcService } from './trpc.service'

const CALIBRATION_KEY = ['calibration'] as const

@Injectable({ providedIn: 'root' })
export class CalibrationService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  readonly myScores = injectQuery(() => ({
    queryKey: [...CALIBRATION_KEY, 'my'],
    queryFn: () => this.trpc.client.calibration.myScores.query(),
  }))

  userScores(userId: string) {
    return injectQuery(() => ({
      queryKey: [...CALIBRATION_KEY, 'user', userId],
      queryFn: () =>
        this.trpc.client.calibration.userScores.query({ userId }),
      enabled: !!userId,
    }))
  }

  leaderboard(period?: string, category?: string) {
    return injectQuery(() => ({
      queryKey: [...CALIBRATION_KEY, 'leaderboard', period, category],
      queryFn: () =>
        this.trpc.client.calibration.leaderboard.query({ period, category }),
    }))
  }

  readonly recompute = injectMutation(() => ({
    mutationFn: (input?: { userId?: string }) =>
      this.trpc.client.calibration.recompute.mutate(input ?? {}),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...CALIBRATION_KEY] })
    },
  }))
}
