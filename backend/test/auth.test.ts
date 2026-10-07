import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { users, visits } from '../src/db/schema'
import { DEV_JWT_SECRET } from '../src/lib/jwt'
import { createAgent, signUp } from './helpers'

function sessionCookie(res: request.Response): string {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('auth_token='))
  if (!cookie) throw new Error('auth_token cookie not set')
  return cookie.split(';')[0]
}

function legacyToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET ?? DEV_JWT_SECRET, { expiresIn: '7d' })
}

describe('auth', () => {
  it('registers a user and sets an auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ login: 'alex', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.login).toBe('alex')
    expect(res.headers['set-cookie']?.join('')).toContain('auth_token')
  })

  it('rejects a duplicate login with 409', async () => {
    const agent = createAgent()
    await signUp(agent, 'dupuser')
    const res = await request(app).post('/api/auth/register').send({ login: 'dupuser', password: 'password123' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('LOGIN_TAKEN')
    expect(res.body.error.message).toContain('Логин уже занят')
  })

  it('rejects a short password with 400 and a Russian message', async () => {
    const res = await request(app).post('/api/auth/register').send({ login: 'shortuser', password: '12345' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('6 символов')
  })

  it('logs in with correct credentials', async () => {
    const agent = createAgent()
    await signUp(agent, 'ivan')
    const res = await request(app).post('/api/auth/login').send({ login: 'ivan', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.login).toBe('ivan')
  })

  it('rejects a wrong password with 401', async () => {
    const agent = createAgent()
    await signUp(agent, 'petr')
    const res = await request(app).post('/api/auth/login').send({ login: 'petr', password: 'wrong-password' })
    expect(res.status).toBe(401)
  })

  it('requires auth for /me and returns the current user', async () => {
    const anon = await request(app).get('/api/auth/me')
    expect(anon.status).toBe(401)

    const agent = createAgent()
    const { login } = await signUp(agent, 'nik')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.login).toBe(login)
  })

  it('logs out and invalidates the session', async () => {
    const agent = createAgent()
    await signUp(agent, 'outuser')
    await agent.post('/api/auth/logout')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('revokes previously issued tokens on logout', async () => {
    const { res } = await signUp(createAgent(), 'revoked')
    const cookie = sessionCookie(res)
    const before = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(before.status).toBe(200)
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(logout.status).toBe(204)
    const after = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(after.status).toBe(401)
  })

  it('does not let a stale token revoke a session issued after logout', async () => {
    const registered = await request(app).post('/api/auth/register').send({ login: 'stalecookie', password: 'password123' })
    const cookieA = sessionCookie(registered)
    const login = await request(app).post('/api/auth/login').send({ login: 'stalecookie', password: 'password123' })
    const cookieB = sessionCookie(login)
    await request(app).post('/api/auth/logout').set('Cookie', cookieA)
    const staleB = await request(app).get('/api/auth/me').set('Cookie', cookieB)
    expect(staleB.status).toBe(401)
    const relogin = await request(app).post('/api/auth/login').send({ login: 'stalecookie', password: 'password123' })
    const cookieC = sessionCookie(relogin)
    const beforeStaleLogout = await request(app).get('/api/auth/me').set('Cookie', cookieC)
    expect(beforeStaleLogout.status).toBe(200)
    await request(app).post('/api/auth/logout').set('Cookie', cookieA)
    const me = await request(app).get('/api/auth/me').set('Cookie', cookieC)
    expect(me.status).toBe(200)
  })

  it('issues a working session on login after logout', async () => {
    const agent = createAgent()
    await signUp(agent, 'relogin')
    await agent.post('/api/auth/logout')
    await agent.post('/api/auth/login').send({ login: 'relogin', password: 'password123' })
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
  })

  it('rejects a token whose user was deleted with 401', async () => {
    const { res } = await signUp(createAgent(), 'deleted')
    const cookie = sessionCookie(res)
    await db.delete(users).where(eq(users.id, res.body.id))
    const state = await request(app).get('/api/state').set('Cookie', cookie)
    expect(state.status).toBe(401)
  })

  it('accepts a legacy token without a tv claim for a user at tokenVersion 0', async () => {
    const { res } = await signUp(createAgent(), 'legacy')
    const me = await request(app).get('/api/auth/me').set('Cookie', `auth_token=${legacyToken(res.body.id)}`)
    expect(me.status).toBe(200)
  })

  it('rejects a legacy token after its user logs out', async () => {
    const { res } = await signUp(createAgent(), 'legacyout')
    const cookie = `auth_token=${legacyToken(res.body.id)}`
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(logout.status).toBe(204)
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(me.status).toBe(401)
  })

  it('returns role in /me response', async () => {
    const agent = createAgent()
    await signUp(agent, 'roleuser')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('user')
  })

  it('returns role on login', async () => {
    const agent = createAgent()
    await signUp(agent, 'loginrole')
    const res = await agent.post('/api/auth/login').send({ login: 'loginrole', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('user')
  })

  it('returns role on register', async () => {
    const agent = createAgent()
    const res = await agent.post('/api/auth/register').send({ login: 'regrole', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.role).toBe('user')
  })

  it('records a visit on register', async () => {
    const agent = createAgent()
    const { res } = await signUp(agent, 'visitreg')
    const rows = await db.select().from(visits).where(eq(visits.userId, res.body.id))
    expect(rows).toHaveLength(1)
  })

  it('records a visit on login', async () => {
    const agent = createAgent()
    const { res } = await signUp(agent, 'visitlogin')
    await agent.post('/api/auth/login').send({ login: 'visitlogin', password: 'password123' })
    const rows = await db.select().from(visits).where(eq(visits.userId, res.body.id))
    expect(rows).toHaveLength(2)
  })

  it('records a visit on every /me call', async () => {
    const agent = createAgent()
    const { res } = await signUp(agent, 'visitme')
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    await agent.get('/api/auth/me')
    const rows = await db.select().from(visits).where(eq(visits.userId, res.body.id))
    expect(rows).toHaveLength(3)
  })

  it('does not record a visit on failed login', async () => {
    const agent = createAgent()
    const { res } = await signUp(agent, 'visitfail')
    await agent.post('/api/auth/login').send({ login: 'visitfail', password: 'wrong-password' })
    const rows = await db.select().from(visits).where(eq(visits.userId, res.body.id))
    expect(rows).toHaveLength(1)
  })
})
