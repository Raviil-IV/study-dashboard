import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { loginSchema, registerSchema } from '../lib/validation'
import { hashPassword, verifyPassword } from '../lib/password'
import { clearAuthCookie, setAuthCookie } from '../lib/cookies'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'

const log = logger.child({ module: 'auth' })

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  skip: () => process.env.NODE_ENV !== 'production',
})

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { login, password } = registerSchema.parse(req.body)
    const existing = await db.select().from(users).where(eq(users.login, login))
    if (existing.length > 0) {
      res.status(409).json({ error: { code: 'LOGIN_TAKEN', message: 'Логин уже занят' } })
      return
    }
    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({ login, passwordHash }).returning()
    setAuthCookie(res, user.id)
    log.info({ userId: user.id, login }, 'user registered')
    res.status(201).json({ id: user.id, login: user.login, role: user.role })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { login, password } = loginSchema.parse(req.body)
    const [user] = await db.select().from(users).where(eq(users.login, login))
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      log.warn({ login }, 'invalid credentials')
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' } })
      return
    }
    setAuthCookie(res, user.id)
    log.info({ userId: user.id, login }, 'user logged in')
    res.json({ id: user.id, login: user.login, role: user.role })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.status(204).end()
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId))
    if (!user) {
      log.warn({ userId: req.userId }, 'user not found')
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Пользователь не найден' } })
      return
    }
    log.debug({ userId: user.id }, 'user fetched')
    res.json({ id: user.id, login: user.login, role: user.role })
  } catch (err) {
    next(err)
  }
})
