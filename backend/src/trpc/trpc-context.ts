import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import type { Express } from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import type { AuthInfo } from '../middleware/auth.middleware.ts'
import { logger } from '../logger.ts'
import { appRouter } from './index.ts'

export interface TrpcContext {
  auth: AuthInfo | undefined
}

const createContext = ({
  req,
}: CreateExpressContextOptions): TrpcContext => ({
  auth: (req as unknown as { authInfo?: AuthInfo }).authInfo,
})

export const useTrpcMiddleware = (app: Express): void => {
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error }) => {
        logger.error('tRPC error', {
          code: error.code,
          message: error.message,
        })
      },
    }),
  )
}
