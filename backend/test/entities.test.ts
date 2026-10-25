import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { lessons, tasks } from '../src/db/schema'
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

  it('stores the allDay flag and toggles it with a patch', async () => {
    const agent = createAgent()
    await signUp(agent, 'all-day')
    const id = randomUUID()
    const created = await agent
      .post('/api/lessons')
      .send({ ...lessonPayload(id), allDay: true, startTime: '00:00', endTime: '23:59' })
    expect(created.status).toBe(201)
    expect(created.body.allDay).toBe(true)

    const patched = await agent.patch(`/api/lessons/${id}`).send({ allDay: false })
    expect(patched.status).toBe(200)
    expect(patched.body.allDay).toBe(false)
  })

  it('defaults allDay to false for a row inserted without the flag', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'all-day-default')
    const id = randomUUID()
    await db.insert(lessons).values({ ...lessonPayload(id), userId: reg.body.id })
    const [row] = await db.select().from(lessons).where(eq(lessons.id, id))
    expect(row.allDay).toBe(false)
  })

  it('returns 409 CONFLICT when a lesson with the same id already exists', async () => {
    const agent = createAgent()
    await signUp(agent, 'dup-lesson')
    const id = randomUUID()
    const first = await agent.post('/api/lessons').send(lessonPayload(id))
    expect(first.status).toBe(201)
    const res = await agent.post('/api/lessons').send(lessonPayload(id))
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(res.body.error.message).toBe('Запись с таким идентификатором уже существует')
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

  it('patches a title of a once lesson with a stored date (full-row validation passes)', async () => {
    const agent = createAgent()
    await signUp(agent, 'patch-once')
    const id = randomUUID()
    await agent.post('/api/lessons').send({ ...lessonPayload(id), type: 'once', date: '2026-09-04' })
    const res = await agent.patch(`/api/lessons/${id}`).send({ title: 'Алгебра' })
    expect(res.status).toBe(200)
    expect(res.body.date).toBe('2026-09-04')
  })

  it('patches a lesson endTime to a later time', async () => {
    const agent = createAgent()
    await signUp(agent, 'patch-end')
    const id = randomUUID()
    await agent.post('/api/lessons').send(lessonPayload(id))
    const res = await agent.patch(`/api/lessons/${id}`).send({ endTime: '11:00' })
    expect(res.status).toBe(200)
    expect(res.body.endTime).toBe('11:00')
  })

  it('rejects a lesson patch that makes endTime earlier than startTime (400)', async () => {
    const agent = createAgent()
    await signUp(agent, 'patch-refine')
    const id = randomUUID()
    await agent.post('/api/lessons').send(lessonPayload(id))
    const res = await agent.patch(`/api/lessons/${id}`).send({ endTime: '08:00' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('Время конца')
    const [row] = await db.select().from(lessons).where(eq(lessons.id, id))
    expect(row.endTime).toBe('10:30')
  })

  it('patches only the title of a stored lesson whose endTime is earlier than startTime (imported row)', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'patch-legacy')
    const id = randomUUID()
    await db.insert(lessons).values({
      id,
      userId: reg.body.id,
      title: 'Импорт',
      type: 'weekly',
      weekday: 1,
      startTime: '09:00',
      endTime: '08:00',
    })
    const res = await agent.patch(`/api/lessons/${id}`).send({ title: 'Переименована' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Переименована')
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

  it('creates a task with a null dueDate', async () => {
    const agent = createAgent()
    await signUp(agent, 'task-null')
    const res = await agent.post('/api/tasks').send({
      id: randomUUID(),
      title: 'Без срока',
      priority: 'low',
      status: 'todo',
      dueDate: null,
      createdAt: new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    expect(res.body.dueDate).toBeNull()
  })

  it('clears a task dueDate with a null patch', async () => {
    const agent = createAgent()
    await signUp(agent, 'task-clear')
    const id = randomUUID()
    const created = await agent.post('/api/tasks').send({
      id,
      title: 'Со сроком',
      priority: 'medium',
      status: 'todo',
      dueDate: '2026-09-01',
      createdAt: new Date().toISOString(),
    })
    expect(created.status).toBe(201)
    const res = await agent.patch(`/api/tasks/${id}`).send({ dueDate: null })
    expect(res.status).toBe(200)
    expect(res.body.dueDate).toBeNull()
  })

  it('clears a task completedAt with a null patch', async () => {
    const agent = createAgent()
    await signUp(agent, 'task-uncomplete')
    const id = randomUUID()
    const created = await agent.post('/api/tasks').send({
      id,
      title: 'Выполнено',
      priority: 'medium',
      status: 'done',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    })
    expect(created.status).toBe(201)
    const res = await agent.patch(`/api/tasks/${id}`).send({ completedAt: null })
    expect(res.status).toBe(200)
    expect(res.body.completedAt).toBeNull()
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id))
    expect(row.completedAt).toBeNull()
  })

  it('patches a title of a task with a stored dueDate (full-row validation passes)', async () => {
    const agent = createAgent()
    await signUp(agent, 'task-due-title')
    const id = randomUUID()
    await agent.post('/api/tasks').send({
      id,
      title: 'Со сроком',
      priority: 'medium',
      status: 'todo',
      dueDate: '2026-09-01',
      createdAt: new Date().toISOString(),
    })
    const res = await agent.patch(`/api/tasks/${id}`).send({ title: 'Переименована' })
    expect(res.status).toBe(200)
    expect(res.body.dueDate).toBe('2026-09-01')
  })

  it('returns 404 when patching a foreign task', async () => {
    const owner = createAgent()
    await signUp(owner, 'task-owner')
    const id = randomUUID()
    await owner.post('/api/tasks').send({
      id,
      title: 'Чужая',
      priority: 'low',
      status: 'todo',
      createdAt: new Date().toISOString(),
    })
    const intruder = createAgent()
    await signUp(intruder, 'task-intruder')
    const res = await intruder.patch(`/api/tasks/${id}`).send({ title: 'Взлом' })
    expect(res.status).toBe(404)
  })
})
