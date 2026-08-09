import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

const lessonPayload = (id: string) => ({
  id,
  title: 'Математика',
  type: 'weekly' as const,
  weekday: 1,
  startTime: '09:00',
  endTime: '10:30',
})

describe('entities CRUD', () => {
  it('creates a lesson and returns it', async () => {
    const agent = createAgent()
    await signUp(agent, 'crud')
    const id = randomUUID()
    const res = await agent.post('/api/lessons').send(lessonPayload(id))
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Математика')
    expect(res.body.userId).toBeTruthy()
  })

  it('rejects a lesson with invalid end time (400)', async () => {
    const agent = createAgent()
    await signUp(agent, 'invalid')
    const res = await agent.post('/api/lessons').send({ ...lessonPayload(randomUUID()), endTime: '08:00' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('Время конца')
  })

  it('patches a lesson owned by the user', async () => {
    const agent = createAgent()
    await signUp(agent, 'patch')
    const id = randomUUID()
    await agent.post('/api/lessons').send(lessonPayload(id))
    const res = await agent.patch(`/api/lessons/${id}`).send({ title: 'Алгебра' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Алгебра')
  })

  it('returns 404 when patching a foreign lesson', async () => {
    const owner = createAgent()
    await signUp(owner, 'owner')
    const id = randomUUID()
    await owner.post('/api/lessons').send(lessonPayload(id))

    const intruder = createAgent()
    await signUp(intruder, 'intruder')
    const res = await intruder.patch(`/api/lessons/${id}`).send({ title: 'Взлом' })
    expect(res.status).toBe(404)
  })

  it('deletes a lesson and returns 404 for a foreign one', async () => {
    const owner = createAgent()
    await signUp(owner, 'del-owner')
    const id = randomUUID()
    await owner.post('/api/lessons').send(lessonPayload(id))

    const intruder = createAgent()
    await signUp(intruder, 'del-intruder')
    const foreign = await intruder.delete(`/api/lessons/${id}`)
    expect(foreign.status).toBe(404)

    const mine = await owner.delete(`/api/lessons/${id}`)
    expect(mine.status).toBe(204)
  })

  it('creates a task with dueDate and status', async () => {
    const agent = createAgent()
    await signUp(agent, 'task')
    const res = await agent.post('/api/tasks').send({
      id: randomUUID(),
      title: 'Решить 5 задач',
      priority: 'medium',
      status: 'todo',
      dueDate: '2026-09-01',
      createdAt: new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    expect(res.body.dueDate).toBe('2026-09-01')
  })
})
