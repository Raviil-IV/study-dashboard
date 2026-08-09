import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('auth', () => {
  it('registers a user and sets an auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@test.dev', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.email).toBe('a@test.dev')
    expect(res.headers['set-cookie']?.join('')).toContain('sd_token')
  })

  it('rejects a duplicate email with 409', async () => {
    const agent = createAgent()
    await signUp(agent, 'dup@test.dev')
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@test.dev', password: 'password123' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rejects a short password with 400 and a Russian message', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'short@test.dev', password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('8 символов')
  })

  it('logs in with correct credentials', async () => {
    const agent = createAgent()
    await signUp(agent, 'login@test.dev')
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.dev', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('login@test.dev')
  })

  it('rejects a wrong password with 401', async () => {
    const agent = createAgent()
    await signUp(agent, 'wrong@test.dev')
    const res = await request(app).post('/api/auth/login').send({ email: 'wrong@test.dev', password: 'wrong-password' })
    expect(res.status).toBe(401)
  })

  it('requires auth for /me and returns the current user', async () => {
    const anon = await request(app).get('/api/auth/me')
    expect(anon.status).toBe(401)

    const agent = createAgent()
    const { email } = await signUp(agent, 'me@test.dev')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.email).toBe(email)
  })

  it('logs out and invalidates the session', async () => {
    const agent = createAgent()
    await signUp(agent, 'out@test.dev')
    await agent.post('/api/auth/logout')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
