import pg from 'pg'

import cfg from '../utils/cfg.ts'

const { Pool } = pg

export const pgPool = new Pool({
  host: cfg.db.host,
  port: cfg.db.port,
  user: cfg.db.user,
  password: cfg.db.password,
  database: cfg.db.database,
  ssl: false,
})
