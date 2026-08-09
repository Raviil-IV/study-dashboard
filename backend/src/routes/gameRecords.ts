import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { gameRecords as gameRecordsTable } from '../db/schema'
import { gameRecordSchema } from '../lib/validation'

export const gameRecordsRouter = Router()

gameRecordsRouter.put('/', async (req, res, next) => {
  try {
    const { game, difficulty, value } = gameRecordSchema.parse(req.body)
    const [existing] = await db
      .select()
      .from(gameRecordsTable)
      .where(
        and(
          eq(gameRecordsTable.userId, req.userId),
          eq(gameRecordsTable.game, game),
          eq(gameRecordsTable.difficulty, difficulty),
        ),
      )
    const isBetter = !existing || (game === 'snake' ? value > existing.bestValue : value < existing.bestValue)
    if (isBetter) {
      await db
        .insert(gameRecordsTable)
        .values({ userId: req.userId, game, difficulty, bestValue: value })
        .onConflictDoUpdate({
          target: [gameRecordsTable.userId, gameRecordsTable.game, gameRecordsTable.difficulty],
          set: { bestValue: value },
        })
    }
    res.json({ isRecord: isBetter })
  } catch (err) {
    next(err)
  }
})
