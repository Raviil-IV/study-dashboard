import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('auth', () => {
  it('registers a user and sets an auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ login: 'alex', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.login).toBe('alex')
    expect(res.headers['set-cookie']?.join('')).toContain('sd_token')
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
})
