import cors from 'cors'
import express from 'express'

import { logger } from './logger.ts'
import { authMiddleware } from './middleware/auth.middleware.ts'
import { startNightlyCalibration } from './jobs/nightly-calibration.ts'
import { publicApiRouter } from './public-api/routes.ts'
import { useTrpcMiddleware } from './trpc/trpc-context.ts'
import cfg from './utils/cfg.ts'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Health check — before auth
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Public REST API — before auth (has its own token validation)
app.use('/api/v1', publicApiRouter)

// Auth middleware — non-blocking: sets authInfo if token present, passes through otherwise
app.use(authMiddleware)

// tRPC — procedures enforce auth at the procedure level
useTrpcMiddleware(app)

// Start nightly calibration cron job
startNightlyCalibration()

const PORT = cfg.backend.port
app.listen(PORT, () => {
  logger.info(`OUTLOOK backend listening on port ${PORT}`)
})
