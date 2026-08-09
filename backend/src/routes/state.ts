import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { deadlines, focusSessions, gameRecords, lessons, notes, settings, tasks } from '../db/schema'
import { DEFAULT_SETTINGS } from '../lib/defaults'

type GameId = 'memory' | 'snake' | 'minesweeper'
type GameDifficulty = 'easy' | 'medium' | 'hard'

export const stateRouter = Router()

stateRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId
    const [lessonRows, taskRows, deadlineRows, noteRows, sessionRows, settingsRows, recordRows] = await Promise.all([
      db.select().from(lessons).where(eq(lessons.userId, userId)),
      db.select().from(tasks).where(eq(tasks.userId, userId)),
      db.select().from(deadlines).where(eq(deadlines.userId, userId)),
      db.select().from(notes).where(eq(notes.userId, userId)),
      db.select().from(focusSessions).where(eq(focusSessions.userId, userId)),
      db.select().from(settings).where(eq(settings.userId, userId)),
      db.select().from(gameRecords).where(eq(gameRecords.userId, userId)),
    ])

    const gameRecordsOut: Record<GameId, Partial<Record<GameDifficulty, number>>> = {
      memory: {},
      snake: {},
      minesweeper: {},
    }
    for (const r of recordRows) {
      gameRecordsOut[r.game as GameId][r.difficulty as GameDifficulty] = r.bestValue
    }

    const s = settingsRows[0]
    res.json({
      lessons: lessonRows,
      tasks: taskRows,
      deadlines: deadlineRows,
      notes: noteRows,
      focusSessions: sessionRows,
      settings: s
        ? {
            theme: s.theme,
            pomodoroWorkMinutes: s.pomodoroWorkMinutes,
            pomodoroShortBreakMinutes: s.pomodoroShortBreakMinutes,
            pomodoroLongBreakMinutes: s.pomodoroLongBreakMinutes,
          }
        : DEFAULT_SETTINGS,
      gameRecords: gameRecordsOut,
    })
  } catch (err) {
    next(err)
  }
})
