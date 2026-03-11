import { defineConfig } from 'drizzle-kit'

import cfg from './src/utils/cfg.ts'

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle/migrations',
  schema: './src/drizzle/schema.ts',
  schemaFilter: ['app'],
  dbCredentials: {
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    database: cfg.db.database,
    ssl: false,
  },
  verbose: true,
  strict: true,
})
