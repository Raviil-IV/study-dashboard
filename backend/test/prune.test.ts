import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/client'
import { visits } from '../src/db/schema'
import { pruneVisits } from '../src/lib/prune'
import { createAgent, signUp } from './helpers'

describe('pruneVisits', () => {
  it('deletes visits older than 7 days and keeps recent ones', async () => {
    const agent = createAgent()
    const { res } = await signUp(agent, 'pruneuser')
    await db.insert(visits).values([
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        userId: res.body.id,
        visitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        userId: res.body.id,
        visitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])

    const deleted = await pruneVisits()

    expect(deleted).toBe(1)
    const rows = await db.select().from(visits).where(eq(visits.userId, res.body.id))
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.id)).not.toContain('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    expect(rows.map((r) => r.id)).toContain('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  })
})