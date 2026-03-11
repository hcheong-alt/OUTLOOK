import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'

import type { PredictionSubmitInput } from '@models/trpc.models'
import { TrpcService } from './trpc.service'

const PREDICTION_KEY = ['predictions'] as const
const MY_PREDICTIONS_KEY = ['predictions', 'my'] as const

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  listByQuestion(questionId: string) {
    return injectQuery(() => ({
      queryKey: [...PREDICTION_KEY, 'byQuestion', questionId],
      queryFn: () =>
        this.trpc.client.prediction.listByQuestion.query({ questionId }),
      enabled: !!questionId,
    }))
  }

  myHistory(questionId: string) {
    return injectQuery(() => ({
      queryKey: [...PREDICTION_KEY, 'myHistory', questionId],
      queryFn: () =>
        this.trpc.client.prediction.myHistory.query({ questionId }),
      enabled: !!questionId,
    }))
  }

  readonly myPredictions = injectQuery(() => ({
    queryKey: [...MY_PREDICTIONS_KEY],
    queryFn: () => this.trpc.client.prediction.myPredictions.query({ page: 1, pageSize: 100 }),
  }))

  readonly submit = injectMutation(() => ({
    mutationFn: (input: PredictionSubmitInput) =>
      this.trpc.client.prediction.submit.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...PREDICTION_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...MY_PREDICTIONS_KEY] })
    },
  }))
}
