import config from 'config'
import { z } from 'zod'

const EcosystemAppSchema = z.object({
  name: z.string(),
  url: z.string(),
  accent: z.string(),
})

const AppConfigSchema = z.object({
  app_name: z.string(),
  backend: z.object({
    port: z.number().default(3002),
  }),
  db: z.object({
    host: z.string(),
    port: z.number().default(5434),
    user: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  sts: z.object({
    type: z.enum(['keycloak']),
    client_id: z.string(),
    issuer_uri: z.string(),
    scope: z.string(),
  }),
  accessControl: z.object({
    admins: z.array(z.string()),
    defaultRole: z
      .enum(['admin', 'moderator', 'analyst'])
      .default('analyst'),
  }),
  scoring: z.object({
    leaderboard_min_predictions: z.number().default(10),
    nightly_cron: z.string().default('0 2 * * *'),
  }),
  logging: z.object({
    level: z.string().default('info'),
    coloring: z.boolean().default(false),
  }),
  ecosystem: z.object({
    apps: z.array(EcosystemAppSchema).default([]),
  }),
})

const parsed = AppConfigSchema.safeParse(config.util.toObject())
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid configuration:',
    JSON.stringify(parsed.error.format(), null, 2),
  )
  process.exit(1)
}

const cfg = parsed.data
export default cfg
