import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

import type { TrpcContext } from './trpc-context.ts'

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
})

export const router = t.router
export const middleware = t.middleware
export const publicProcedure = t.procedure

// Base procedure (requires authentication)
export const procedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } })
})

// Admin-only procedure
export const adminProcedure = procedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({ ctx })
})

// Moderator+ procedure (admin + moderator)
export const moderatorProcedure = procedure.use(({ ctx, next }) => {
  if (ctx.auth.role === 'analyst') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Moderator access required',
    })
  }
  return next({ ctx })
})
