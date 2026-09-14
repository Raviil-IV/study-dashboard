import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { count } from 'drizzle-orm'
import { db } from '../db/client'
import { tasks, users, visits } from '../db/schema'
import { getGlobalStats, getTrend, getUserStats } from '../lib/stats'
import { roleParamSchema, userIdParamSchema } from '../lib/validation'

export const adminRouter = Router()

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [stats, trend] = await Promise.all([getGlobalStats(), getTrend(null)])
    res.json({ ...stats, trend })
  } catch (err) {
    next(err)
  }
})

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const [userRows, taskCounts, visitCounts] = await Promise.all([
      db
        .select({ id: users.id, login: users.login, role: users.role, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt)),
      db.select({ userId: tasks.userId, n: count(tasks.id) }).from(tasks).groupBy(tasks.userId),
      db.select({ userId: visits.userId, n: count(visits.id) }).from(visits).groupBy(visits.userId),
    ])
    const taskMap = new Map(taskCounts.map((r) => [r.userId, Number(r.n)]))
    const visitMap = new Map(visitCounts.map((r) => [r.userId, Number(r.n)]))
    res.json(
      userRows.map((u) => ({
        ...u,
        taskCount: taskMap.get(u.id) ?? 0,
        visitCount: visitMap.get(u.id) ?? 0,
      })),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params)
    if (id === req.userId) {
      res.status(403).json({ error: { code: 'SELF_ROLE_CHANGE', message: 'Нельзя менять роль самому себе' } })
      return
    }
    const { role } = roleParamSchema.parse(req.body)
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({ id: users.id })
    if (!updated) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } })
      return
    }
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

adminRouter.get('/users/:id/stats', async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params)
    const stats = await getUserStats(id)
    if (!stats) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } })
      return
    }
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params)
    if (id === req.userId) {
      res.status(403).json({ error: { code: 'SELF_DELETE', message: 'Нельзя удалить самого себя' } })
      return
    }
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    if (!deleted) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } })
      return
    }
    res.json(deleted)
  } catch (err) {
    next(err)
  }
})
