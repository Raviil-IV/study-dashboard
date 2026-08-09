import { beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '../src/db/client'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE lessons, tasks, deadlines, notes, focus_sessions, settings, game_records, users RESTART IDENTITY CASCADE`,
  )
})
