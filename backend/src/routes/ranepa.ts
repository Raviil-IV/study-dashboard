import { Router } from 'express'
import { and, eq, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { lessons, ranepaImports } from '../db/schema'
import { parseScheduleHtml, type InvalidLesson, type ParsedLesson } from '../lib/ranepa'
import { fetchSchedulePage, isValidRanepaUrl } from '../lib/ranepaFetch'
import { logger } from '../lib/logger'

const log = logger.child({ module: 'ranepa' })

const urlSchema = z
  .string()
  .refine(isValidRanepaUrl, 'Ссылка должна вести на страницу расписания https://spb.ranepa.ru/raspisanie/…')

const fixSchema = z.object({
  index: z.number().int().min(0),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
    .refine((d) => {
      const [y, m, day] = d.split('-').map(Number)
      const dt = new Date(y, m - 1, day)
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day
    }, 'Дата не существует в календаре'),
})

const importSchema = z.object({
  url: urlSchema,
  fixes: z.array(fixSchema).max(100).optional(),
  groups: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
})

type ImportBody = z.infer<typeof importSchema>

function loadAndParse(url: string) {
  return fetchSchedulePage(url).then((html) => parseScheduleHtml(html))
}

function upstreamError(err: unknown) {
  return {
    error: {
      code: 'UPSTREAM',
      message: err instanceof Error ? err.message : 'Не удалось загрузить расписание с сайта РАНХиГС',
    },
  }
}

function lessonRow(
  userId: string,
  url: string,
  data: Pick<ParsedLesson, 'title' | 'weekday' | 'startTime' | 'endTime' | 'date' | 'location'> &
    Pick<InvalidLesson, 'type' | 'teacher'>,
) {
  return {
    userId,
    title: data.title,
    type: 'once' as const,
    weekday: data.weekday,
    startTime: data.startTime,
    endTime: data.endTime,
    date: data.date,
    location: data.location,
    note: [data.type, data.teacher].filter(Boolean).join(' · ') || undefined,
    sourceUrl: url,
  }
}

export const ranepaRouter = Router()

ranepaRouter.post('/preview', async (req, res, next) => {
  try {
    const { url } = importSchema.parse(req.body as ImportBody)
    log.info({ userId: req.userId, url }, 'ranepa preview')

    let parsed
    try {
      parsed = await loadAndParse(url)
    } catch (err) {
      res.status(502).json(upstreamError(err))
      return
    }

    const dates = parsed.lessons.map((l) => l.date).sort()
    res.json({
      groupName: parsed.groupName,
      count: parsed.lessons.length,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
      lessons: parsed.lessons as ParsedLesson[],
      invalid: parsed.invalid as InvalidLesson[],
      groups: parsed.groups,
    })
  } catch (err) {
    next(err)
  }
})

ranepaRouter.post('/import', async (req, res, next) => {
  try {
    const { url, fixes, groups } = importSchema.parse(req.body as ImportBody)
    log.info({ userId: req.userId, url, fixes: fixes?.length ?? 0, groups: groups?.length ?? 0 }, 'ranepa import')

    let parsed
    try {
      parsed = await loadAndParse(url)
    } catch (err) {
      res.status(502).json(upstreamError(err))
      return
    }

    const userId = req.userId
    const syncedAt = new Date().toISOString()
    // Пустой/отсутствующий фильтр = все группы (обратная совместимость)
    const selected = groups && groups.length > 0 ? new Set(groups) : null

    const created = await db.transaction(async (tx) => {
      // Один импорт на пользователя: любой новый импорт заменяет всё ранее импортированное
      await tx.delete(lessons).where(and(eq(lessons.userId, userId), isNotNull(lessons.sourceUrl)))
      await tx.delete(ranepaImports).where(eq(ranepaImports.userId, userId))

      const fixedDates = new Map((fixes ?? []).map((f) => [f.index, f.date]))
      const rows = [
        ...parsed.lessons
          .filter((l) => !selected || selected.has(l.rawGroup))
          .map((l) => lessonRow(userId, url, l)),
        ...parsed.invalid.flatMap((l, index) => {
          if (selected && !selected.has(l.rawGroup)) return []
          const date = fixedDates.get(index)
          if (!date) return []
          const [y, m, d] = date.split('-').map(Number)
          return [
            lessonRow(userId, url, {
              title: l.title,
              weekday: new Date(y, m - 1, d).getDay(),
              startTime: l.startTime,
              endTime: l.endTime,
              date,
              location: l.location,
              type: l.type,
              teacher: l.teacher,
            }),
          ]
        }),
      ]

      const inserted = rows.length > 0 ? await tx.insert(lessons).values(rows).returning() : []
      await tx
        .insert(ranepaImports)
        .values({ userId, url, groupName: parsed.groupName, syncedAt, groups: groups ?? [] })
        .onConflictDoUpdate({
          target: [ranepaImports.userId, ranepaImports.url],
          set: { groupName: parsed.groupName, syncedAt, groups: groups ?? [] },
        })
      return inserted
    })

    res.json({ groupName: parsed.groupName, count: created.length, lessons: created })
  } catch (err) {
    next(err)
  }
})

ranepaRouter.delete('/import', async (req, res, next) => {
  try {
    log.info({ userId: req.userId }, 'ranepa import removed')
    const userId = req.userId
    await db.transaction(async (tx) => {
      await tx.delete(lessons).where(and(eq(lessons.userId, userId), isNotNull(lessons.sourceUrl)))
      await tx.delete(ranepaImports).where(eq(ranepaImports.userId, userId))
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

ranepaRouter.get('/status', async (req, res, next) => {
  try {
    const rows = await db.select().from(ranepaImports).where(eq(ranepaImports.userId, req.userId))
    res.json({
      imports: rows.map((r) => ({ url: r.url, groupName: r.groupName, syncedAt: r.syncedAt, groups: r.groups })),
    })
  } catch (err) {
    next(err)
  }
})
