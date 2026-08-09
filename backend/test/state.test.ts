import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('state snapshot', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/state')
    expect(res.status).toBe(401)
  })

  it('returns empty collections and default settings for a new user', async () => {
    const agent = createAgent()
    await signUp(agent, 'fresh')
    const res = await agent.get('/api/state')
    expect(res.status).toBe(200)
    expect(res.body.lessons).toEqual([])
    expect(res.body.tasks).toEqual([])
    expect(res.body.settings.theme).toBe('system')
    expect(res.body.gameRecords).toEqual({ memory: {}, snake: {}, minesweeper: {} })
  })

  it('returns everything the user created, including game records', async () => {
    const agent = createAgent()
    await signUp(agent, 'full')
    await agent.post('/api/lessons').send({ id: randomUUID(), title: 'Физика', type: 'weekly', weekday: 2, startTime: '11:00', endTime: '12:30' })
    await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 40, pomodoroShortBreakMinutes: 7, pomodoroLongBreakMinutes: 20 })
    await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'hard', value: 42 })

    const res = await agent.get('/api/state')
    expect(res.body.lessons).toHaveLength(1)
    expect(res.body.lessons[0].title).toBe('Физика')
    expect(res.body.settings.theme).toBe('dark')
    expect(res.body.gameRecords.snake.hard).toBe(42)
  })

  it('isolates data between two users', async () => {
    const agentA = createAgent()
    await signUp(agentA, 'iso-a')
    await agentA.post('/api/tasks').send({ id: randomUUID(), title: 'Секрет A', priority: 'high', status: 'todo', createdAt: new Date().toISOString() })

    const agentB = createAgent()
    await signUp(agentB, 'iso-b')
    const resB = await agentB.get('/api/state')
    expect(resB.body.tasks).toEqual([])
  })
})
