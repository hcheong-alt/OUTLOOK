import cron from 'node-cron'

import cfg from '../utils/cfg.ts'
import { recomputeAllCalibration } from '../services/scoring.service.ts'
import { logger } from '../logger.ts'

export function startNightlyCalibration() {
  const cronExpression = cfg.scoring.nightly_cron

  logger.info('Scheduling nightly calibration job', {
    cron: cronExpression,
  })

  cron.schedule(cronExpression, async () => {
    const startTime = Date.now()
    logger.info('Nightly calibration job started')

    try {
      const result = await recomputeAllCalibration()
      const durationMs = Date.now() - startTime

      logger.info('Nightly calibration job finished', {
        usersRecomputed: result.count,
        durationMs,
      })
    } catch (err) {
      const durationMs = Date.now() - startTime

      logger.error('Nightly calibration job failed', {
        error: (err as Error).message,
        stack: (err as Error).stack,
        durationMs,
      })
    }
  })
}
