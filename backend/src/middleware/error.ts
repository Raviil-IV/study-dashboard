import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger'

const log = logger.child({ module: 'error' })

interface PgError {
  code?: string
  constraint?: string
}

// Колонка users.email переименована в login (0001_login_auth.sql), но имя ограничения осталось прежним
const LOGIN_UNIQUE_CONSTRAINT = 'users_email_unique'

// Drizzle оборачивает ошибку драйвера в DrizzleQueryError: code и constraint лежат в cause
function findUniqueViolation(err: unknown): PgError | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const cause = (err as { cause?: unknown }).cause
  for (const candidate of [err, cause]) {
    if (typeof candidate === 'object' && candidate !== null && (candidate as PgError).code === '23505') {
      return candidate as PgError
    }
  }
  return undefined
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Некорректные данные'
    res.status(400).json({ error: { code: 'VALIDATION', message } })
    return
  }
  const violation = findUniqueViolation(err)
  if (violation) {
    if (violation.constraint === LOGIN_UNIQUE_CONSTRAINT) {
      res.status(409).json({ error: { code: 'LOGIN_TAKEN', message: 'Логин уже занят' } })
    } else {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Запись с таким идентификатором уже существует' } })
    }
    return
  }
  log.error({ err }, 'internal error')
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Что-то пошло не так' } }) }
