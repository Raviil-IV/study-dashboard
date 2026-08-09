import type { NextFunction, Request, Response } from 'express'
import { COOKIE_NAME } from '../lib/cookies'
import { verifyToken } from '../lib/jwt'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Требуется вход' } })
    return
  }
  try {
    req.userId = verifyToken(token).userId
    next()
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Сессия истекла, войдите снова' } })
  }
}
