import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { notes, tasks, users, visits } from '../src/db/schema'
import { createAgent, promoteToAdmin, signUp } from './helpers'

describe('admin', () => {
  it('returns 401 without an auth cookie', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a regular user', async () => {
    const agent = createAgent()
    await signUp(agent, 'regular')
    const res = await agent.get('/api/admin/users')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('lists users with counts for an admin', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const res = await agent.get('/api/admin/users')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ login: 'boss', role: 'admin', taskCount: 0, visitCount: 1 })
  })

  it('changes role of another user', async () => {
    const admin = createAgent()
    await signUp(admin, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: reg } = await signUp(target, 'worker')
    const r = await admin.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'admin' })
    expect(r.status).toBe(200)
    const list = await admin.get('/api/admin/users')
    const row = list.body.find((u: { id: string }) => u.id === reg.body.id)
    expect(row.role).toBe('admin')
  })

  it('forbids changing own role', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'user' })
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('SELF_ROLE_CHANGE')
  })

  it('rejects an invalid role with 400', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: reg } = await signUp(target, 'worker')
    const r = await agent.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'superuser' })
    expect(r.status).toBe(400)
  })

  it('returns 404 for an unknown user', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.patch('/api/admin/users/00000000-0000-0000-0000-000000000000/role').send({ role: 'admin' })
    expect(r.status).toBe(404)
    expect(r.body.error.code).toBe('USER_NOT_FOUND')
  })

  it('deletes a user and all their data', async () => {
    const admin = createAgent()
    await signUp(admin, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: reg } = await signUp(target, 'worker')

    await db.insert(tasks).values({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: reg.body.id,
      title: 'task',
      priority: 'medium',
      status: 'todo',
    })
    await db.insert(notes).values({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      userId: reg.body.id,
      title: 'note',
      content: 'c',
    })
    await db.insert(visits).values({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      userId: reg.body.id,
    })

    const r = await admin.delete(`/api/admin/users/${reg.body.id}`)
    expect(r.status).toBe(200)

    expect(await db.select().from(users).where(eq(users.id, reg.body.id))).toHaveLength(0)
    expect(await db.select().from(tasks).where(eq(tasks.userId, reg.body.id))).toHaveLength(0)
    expect(await db.select().from(notes).where(eq(notes.userId, reg.body.id))).toHaveLength(0)
    expect(await db.select().from(visits).where(eq(visits.userId, reg.body.id))).toHaveLength(0)
  })

  it('forbids deleting yourself', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.delete(`/api/admin/users/${reg.body.id}`)
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('SELF_DELETE')
  })

  it('returns 404 for an unknown user on delete', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.delete('/api/admin/users/00000000-0000-0000-0000-000000000000')
    expect(r.status).toBe(404)
    expect(r.body.error.code).toBe('USER_NOT_FOUND')
  })

  it('returns 403 for a regular user on delete', async () => {
    const agent = createAgent()
    await signUp(agent, 'regular')
    const r = await agent.delete('/api/admin/users/00000000-0000-0000-0000-000000000000')
    expect(r.status).toBe(403)
  })
})
