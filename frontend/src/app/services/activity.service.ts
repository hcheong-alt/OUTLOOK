import { Injectable, inject } from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'

import { TrpcService } from './trpc.service'

const ACTIVITY_KEY = ['activity'] as const

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly trpc = inject(TrpcService)

  listByEntity(entityType: string, entityId: string) {
    return injectQuery(() => ({
      queryKey: [...ACTIVITY_KEY, entityType, entityId],
      queryFn: () =>
        this.trpc.client.activity.listByEntity.query({
          entityType,
          entityId,
        }),
      enabled: !!entityId,
    }))
  }

  readonly recent = injectQuery(() => ({
    queryKey: [...ACTIVITY_KEY, 'recent'],
    queryFn: () => this.trpc.client.activity.recent.query({ limit: 20 }),
  }))
}
