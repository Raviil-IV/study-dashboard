import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

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
    res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Пользователь с таким email уже существует' } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Что-то пошло не так' } })
}
