import { Injectable, inject } from '@angular/core'
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
} from '@trpc/client'
import superjson from 'superjson'

import type { AppRouter } from '../../../../backend/src/trpc/'
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service'

@Injectable({ providedIn: 'root' })
export class TrpcService {
  private readonly auth = inject(AuthService)

  readonly client = createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => Boolean(op.context['skipBatch']),
        true: httpLink({
          url: `${environment.baseUrl}/trpc`,
          transformer: superjson,
          headers: () => this.getHeaders(),
        }),
        false: httpBatchLink({
          url: `${environment.baseUrl}/trpc`,
          transformer: superjson,
          maxURLLength: 2048,
          headers: () => this.getHeaders(),
        }),
      }),
    ],
  })

  private getHeaders(): Record<string, string> {
    const token = this.auth.getAccessToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }
}
