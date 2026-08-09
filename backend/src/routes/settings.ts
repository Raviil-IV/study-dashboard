import { Router } from 'express'
import { db } from '../db/client'
import { settings as settingsTable } from '../db/schema'
import { settingsSchema } from '../lib/validation'

export const settingsRouter = Router()

settingsRouter.put('/', async (req, res, next) => {
  try {
    const parsed = settingsSchema.parse(req.body)
    const row = {
      theme: parsed.theme,
      pomodoroWorkMinutes: parsed.pomodoroWorkMinutes,
      pomodoroShortBreakMinutes: parsed.pomodoroShortBreakMinutes,
      pomodoroLongBreakMinutes: parsed.pomodoroLongBreakMinutes,
    }
    await db
      .insert(settingsTable)
      .values({ userId: req.userId, ...row })
      .onConflictDoUpdate({ target: settingsTable.userId, set: row })
    res.json(parsed)
  } catch (err) {
    next(err)
  }
})
