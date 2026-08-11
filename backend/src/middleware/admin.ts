import type { NextFunction, Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId))
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Доступ запрещён' } })
      return
    }
    next()
  } catch (err) {
    next(err)
  }
}
