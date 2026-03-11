import { Injectable, inject } from '@angular/core'
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental'
import { signal } from '@angular/core'

import type {
  QuestionCreateInput,
  QuestionListInput,
  QuestionUpdateInput,
} from '@models/trpc.models'
import { TrpcService } from './trpc.service'

const QUESTION_LIST_KEY = ['questions', 'list'] as const
const QUESTION_DETAIL_KEY = ['questions', 'detail'] as const
const QUESTION_STATS_KEY = ['questions', 'stats'] as const

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly trpc = inject(TrpcService)
  private readonly queryClient = injectQueryClient()

  readonly listParams = signal<QuestionListInput>({
    page: 1,
    pageSize: 10,
    sort: 'createdAt',
    sortDir: 'desc',
    filters: {},
  })

  readonly list = injectQuery(() => ({
    queryKey: [...QUESTION_LIST_KEY, this.listParams()],
    queryFn: () => this.trpc.client.question.list.query(this.listParams()),
  }))

  readonly stats = injectQuery(() => ({
    queryKey: [...QUESTION_STATS_KEY],
    queryFn: () => this.trpc.client.question.stats.query(),
  }))

  getDetail(id: string) {
    return injectQuery(() => ({
      queryKey: [...QUESTION_DETAIL_KEY, id],
      queryFn: () => this.trpc.client.question.get.query({ id }),
      enabled: !!id,
    }))
  }

  readonly create = injectMutation(() => ({
    mutationFn: (input: QuestionCreateInput) =>
      this.trpc.client.question.create.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_LIST_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_STATS_KEY] })
    },
  }))

  readonly update = injectMutation(() => ({
    mutationFn: (input: QuestionUpdateInput) =>
      this.trpc.client.question.update.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_LIST_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_DETAIL_KEY] })
    },
  }))

  readonly resolve = injectMutation(() => ({
    mutationFn: (input: {
      id: string
      outcome: 'resolved_yes' | 'resolved_no' | 'ambiguous'
      resolutionNotes?: string
    }) => this.trpc.client.question.resolve.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_LIST_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_DETAIL_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_STATS_KEY] })
    },
  }))

  readonly cancel = injectMutation(() => ({
    mutationFn: (input: { id: string }) =>
      this.trpc.client.question.cancel.mutate(input),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_LIST_KEY] })
      this.queryClient.invalidateQueries({ queryKey: [...QUESTION_DETAIL_KEY] })
    },
  }))
}
