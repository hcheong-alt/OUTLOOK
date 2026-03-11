import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'

import type { CommentCreateInput } from '@models/trpc.models'
import { TrpcService } from './trpc.service'

const COMMENT_KEY = ['comments'] as const

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  listByQuestion(questionId: string) {
    return injectQuery(() => ({
      queryKey: [...COMMENT_KEY, questionId],
      queryFn: () =>
        this.trpc.client.comment.listByQuestion.query({ questionId }),
      enabled: !!questionId,
    }))
  }

  readonly create = injectMutation(() => ({
    mutationFn: (input: CommentCreateInput) =>
      this.trpc.client.comment.create.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...COMMENT_KEY] })
    },
  }))
}
