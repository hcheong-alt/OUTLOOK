import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

import * as schema from '../drizzle/schema.ts'
import { pgPool } from './db-pool.ts'

export const db = drizzle(pgPool, { schema })

export const dbHealthCheck = async () => {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch {
    return false
  }
}
