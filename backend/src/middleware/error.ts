import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger'

const log = logger.child({ module: 'error' })

interface PgError {
  code?: string
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Некорректные данные'
    res.status(400).json({ error: { code: 'VALIDATION', message } })
    return
  }
  if (typeof err === 'object' && err !== null && (err as PgError).code === '23505') {
    res.status(409).json({ error: { code: 'LOGIN_TAKEN', message: 'Логин уже занят' } })
    return
  }
  log.error({ err }, 'internal error')
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Что-то пошло не так' } }) }
