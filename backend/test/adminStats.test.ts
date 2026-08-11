import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { focusSessions, tasks } from '../src/db/schema'
import { createAgent, promoteToAdmin, signUp } from './helpers'

describe('admin stats', () => {
  it('returns 403 for a regular user', async () => {
    const agent = createAgent()
    await signUp(agent, 'reguser')
    const res = await agent.get('/api/admin/stats')
    expect(res.status).toBe(403)
  })

  it('returns global aggregates', async () => {
    const agent = createAgent()
    const { res: regA } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    await signUp(createAgent(), 'student')

    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await db.insert(tasks).values([
      {
        id: '11111111-1111-4111-8111-111111111111',
        userId: regA.body.id,
        title: 'done task',
        priority: 'medium',
        status: 'done',
        createdAt: yesterday,
        completedAt: yesterday,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        userId: regA.body.id,
        title: 'overdue task',
        priority: 'high',
        status: 'todo',
        dueDate: '2020-01-01',
        createdAt: yesterday,
      },
    ])
    await db.insert(focusSessions).values([
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId: regA.body.id,
        label: 'f',
        startedAt: yesterday,
        durationMinutes: 25,
        completed: true,
      },
    ])

    const res = await agent.get('/api/admin/stats')
    expect(res.status).toBe(200)
    const s = res.body
    expect(s.totalUsers).toBe(2)
    expect(s.newUsers30d).toBe(2)
    expect(s.focusMinutes7d).toBe(25)
    expect(s.focusMinutes30d).toBe(25)
    expect(s.tasksTotal).toBe(2)
    expect(s.tasksDone).toBe(1)
    expect(s.tasksDonePercent).toBe(50)
    expect(s.tasksOverdue).toBe(1)
    expect(s.activeUsers30d).toBe(1)
    expect(s.notesTotal).toBe(0)
    expect(s.trend).toHaveLength(30)
    expect(s.trend[28].focusMinutes).toBe(25)
    expect(s.trend[28].tasksDone).toBe(1)
  })
})
