import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

export const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/study_dashboard'

export const pool = new Pool({ connectionString })

export const db = drizzle(pool)
