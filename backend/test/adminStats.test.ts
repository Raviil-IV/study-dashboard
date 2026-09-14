import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { focusSessions, tasks, visits } from '../src/db/schema'
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
    await db.insert(visits).values([
      {
        id: '77777777-7777-4777-8777-777777777777',
        userId: regA.body.id,
        visitedAt: yesterday,
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
    expect(s.activeUsers7d).toBe(2)
    expect(s.activeUsers30d).toBeUndefined()
    expect(s.notesTotal).toBe(0)
    expect(s.trend).toHaveLength(7)
    expect(s.trend[5].visits).toBe(1)
    expect(s.trend[5].tasksDone).toBe(1)
  })

  it('returns per-user stats', async () => {
    const agent = createAgent()
    const { res: regA } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: regB } = await signUp(target, 'student')

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await db.insert(tasks).values([
      {
        id: '44444444-4444-4444-8444-444444444444',
        userId: regB.body.id,
        title: 'done task',
        priority: 'low',
        status: 'done',
        createdAt: yesterday,
        completedAt: yesterday,
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        userId: regB.body.id,
        title: 'in progress',
        priority: 'high',
        status: 'in-progress',
        createdAt: yesterday,
      },
    ])
    await db.insert(focusSessions).values([
      {
        id: '66666666-6666-4666-8666-666666666666',
        userId: regB.body.id,
        label: 'f',
        startedAt: yesterday,
        durationMinutes: 50,
        completed: true,
      },
    ])
    await db.insert(visits).values([
      {
        id: '88888888-8888-4888-8888-888888888888',
        userId: regB.body.id,
        visitedAt: yesterday,
      },
    ])

    const res = await agent.get(`/api/admin/users/${regB.body.id}/stats`)
    expect(res.status).toBe(200)
    const s = res.body
    expect(s.profile.login).toBe('student')
    expect(s.profile.role).toBe('user')
    expect(s.focus).toMatchObject({ totalSessions: 1, totalMinutes: 50, minutes30d: 50 })
    expect(s.tasks).toMatchObject({ total: 2, done: 1, inProgress: 1, overdue: 0 })
    expect(s.activity).toHaveLength(7)
    expect(s.activity[5].visits).toBe(1)
    expect(s.activity[5].tasksDone).toBe(1)
    expect(s.content.tasks).toHaveLength(2)
    expect(s.content.tasks.map((t: { title: string }) => t.title).sort()).toEqual(['done task', 'in progress'])
    expect(s.content.focus).toHaveLength(1)
    expect(s.content.focus[0]).toMatchObject({ durationMinutes: 50, completed: true })
    expect(s.content.deadlines).toEqual([])
    expect(s.content.notes).toEqual([])
    expect(s.content.lessons).toEqual([])
  })

  it('returns 404 for an unknown user', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const res = await agent.get('/api/admin/users/00000000-0000-0000-0000-000000000000/stats')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('USER_NOT_FOUND')
  })
})
