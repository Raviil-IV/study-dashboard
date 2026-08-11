import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { count } from 'drizzle-orm'
import { db } from '../db/client'
import { focusSessions, tasks, users } from '../db/schema'
import { roleParamSchema, userIdParamSchema } from '../lib/validation'

export const adminRouter = Router()

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const [userRows, taskCounts, sessionCounts] = await Promise.all([
      db
        .select({ id: users.id, login: users.login, role: users.role, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt)),
      db.select({ userId: tasks.userId, n: count(tasks.id) }).from(tasks).groupBy(tasks.userId),
      db.select({ userId: focusSessions.userId, n: count(focusSessions.id) }).from(focusSessions).groupBy(focusSessions.userId),
    ])
    const taskMap = new Map(taskCounts.map((r) => [r.userId, Number(r.n)]))
    const sessionMap = new Map(sessionCounts.map((r) => [r.userId, Number(r.n)]))
    res.json(
      userRows.map((u) => ({
        ...u,
        taskCount: taskMap.get(u.id) ?? 0,
        sessionCount: sessionMap.get(u.id) ?? 0,
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
