import { createLogger, format, transports } from 'winston'

import cfg from './utils/cfg.ts'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  audit: 4,
  verbose: 5,
  debug: 6,
} as const

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  audit: 'cyan',
  verbose: 'grey',
  debug: 'blue',
} as const

const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet()
  return JSON.stringify(obj, (_key, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  })
}

const consoleFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.colorize({ colors }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${safeStringify(meta)}` : ''
    return `${String(timestamp)} ${level}: ${String(message)}${metaStr}`
  }),
)

export const logger = createLogger({
  levels,
  level: cfg.logging.level,
  format: format.combine(format.timestamp()),
  transports: [new transports.Console({ format: consoleFormat })],
})

export const audit = (userId: string, payload: unknown) => {
  logger.log('audit', 'audit event', { userId, payload })
}
