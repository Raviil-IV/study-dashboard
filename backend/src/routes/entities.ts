import { Router, type NextFunction, type Request, type Response } from 'express'
import { and, eq } from 'drizzle-orm'
import type { AnyPgTable } from 'drizzle-orm/pg-core'
import { z, type ZodTypeAny } from 'zod'
import { db } from '../db/client'
import { logger } from '../lib/logger'

const notFound = (res: Response) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } })

// ZodEffects (после .refine()/.transform()) не имеет .partial() — разворачиваем обёртки до ZodObject
function toPartial(schema: ZodTypeAny): ZodTypeAny {
  let current: unknown = schema
  while (
    current &&
    typeof (current as { partial?: unknown }).partial !== 'function' &&
    typeof (current as { innerType?: unknown }).innerType === 'function'
  ) {
    current = (current as { innerType: () => unknown }).innerType()
  }
  return (current as { partial: () => ZodTypeAny }).partial()
}

export function createEntityRouter(table: AnyPgTable, schema: ZodTypeAny): Router {
  const router = Router()
  const ids = { id: 'id', userId: 'userId' } as const
  const column = (name: string) => (table as unknown as Record<string, unknown>)[name] as never
  const tableName = (table as { name?: string }).name ?? 'entity'
  const log = logger.child({ module: tableName })

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
const body = req.body as Record<string, unknown>
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!body.id || typeof body.id !== 'string' || !uuidRegex.test(body.id)) {
body.id = crypto.randomUUID()
}
const parsed = schema.parse(body) as Record<string, unknown>

      const [row] = await db.insert(table).values({ ...parsed, userId: req.userId }).returning()
      log.info({ userId: req.userId }, 'created entity')
      res.status(201).json(row)
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partial = toPartial(schema)
      const parsed = partial.parse(req.body) as Record<string, unknown>
      const [row] = await db
        .update(table)
        .set(parsed)
        .where(and(eq(column(ids.id), req.params.id), eq(column(ids.userId), req.userId)))
        .returning()
      if (!row) {
        notFound(res)
        return
      }
      log.info({ userId: req.userId, entityId: req.params.id }, 'updated entity')
      res.json(row)
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .delete(table)
        .where(and(eq(column(ids.id), req.params.id), eq(column(ids.userId), req.userId)))
        .returning()
      if (rows.length === 0) {
        notFound(res)
        return
      }
      log.info({ userId: req.userId, entityId: req.params.id }, 'deleted entity')
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })

  return router
}
