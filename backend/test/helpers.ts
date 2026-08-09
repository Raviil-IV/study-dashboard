import request from 'supertest'
import { app } from '../src/app'

export function createAgent(): ReturnType<typeof request.agent> {
  return request.agent(app)
}

export async function signUp(
  agent: ReturnType<typeof request.agent>,
  login = `user${Math.random().toString(36).slice(2, 10)}`,
  password = 'password123',
): Promise<{ res: request.Response; login: string; password: string }> {
  const res = await agent.post('/api/auth/register').send({ login, password })
  if (res.status !== 201) throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { res, login, password }
}
