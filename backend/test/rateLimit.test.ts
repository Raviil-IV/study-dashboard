import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createLimiter } from '../src/lib/rateLimit'

describe('createLimiter', () => {
  it('returns 429 once the limit is exceeded', async () => {
    const app = express()
    app.get(
      '/limited',
      createLimiter({ windowMs: 60_000, limit: 2, skip: () => false, keyGenerator: () => 'k' }),
      (_req, res) => {
        res.json({ ok: true })
      },
    )

    expect((await request(app).get('/limited')).status).toBe(200)
    expect((await request(app).get('/limited')).status).toBe(200)
    expect((await request(app).get('/limited')).status).toBe(429)
  })

  it('skips requests by default under NODE_ENV=test', async () => {
    const app = express()
    app.get('/limited', createLimiter({ windowMs: 60_000, limit: 1, keyGenerator: () => 'k' }), (_req, res) => {
      res.json({ ok: true })
    })

    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).get('/limited')).status).toBe(200)
    }
  })
})
