import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
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
    expect(res.body[0]).toMatchObject({ login: 'boss', role: 'admin', taskCount: 0, sessionCount: 0 })
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
})
