import type { NextFunction, Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { COOKIE_NAME } from '../lib/cookies'
import { verifyToken, type TokenPayload } from '../lib/jwt'

const SESSION_EXPIRED = { error: { code: 'UNAUTHORIZED', message: 'Сессия истекла, войдите снова' } }

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Требуется вход' } })
    return
  }
  let payload: TokenPayload
  try {
    payload = verifyToken(token)
  } catch {
    res.status(401).json(SESSION_EXPIRED)
    return
  }
  try {
    const [user] = await db
      .select({ id: users.id, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, payload.userId))
    if (!user || (payload.tv ?? 0) !== user.tokenVersion) {
      res.status(401).json(SESSION_EXPIRED)
      return
    }
    req.userId = payload.userId
    next()
  } catch (err) {
    next(err)
  }
}
