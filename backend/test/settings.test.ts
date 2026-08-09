import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('settings', () => {
  it('requires auth', async () => {
    const res = await request(app).put('/api/settings').send({})
    expect(res.status).toBe(401)
  })

  it('saves and overwrites settings per user', async () => {
    const agent = createAgent()
    await signUp(agent, 's1@test.dev')
    const first = await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 30, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(first.status).toBe(200)
    expect(first.body.theme).toBe('dark')

    const second = await agent.put('/api/settings').send({ theme: 'light', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(second.status).toBe(200)
    expect(second.body.theme).toBe('light')
  })

  it('rejects invalid settings with 400', async () => {
    const agent = createAgent()
    await signUp(agent, 's2@test.dev')
    const res = await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 0, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(res.status).toBe(400)
  })
})
