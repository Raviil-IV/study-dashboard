import rateLimit from 'express-rate-limit'
import type { Request, RequestHandler } from 'express'

type LimiterOptions = {
  windowMs: number
  limit: number
  skip?: (req: Request) => boolean
  keyGenerator?: (req: Request) => string
}

// В тестах лимиты выключены, чтобы запросы из разных тестов не влияли друг на друга.
const skipInTests = (): boolean => process.env.NODE_ENV === 'test'

export function createLimiter({ windowMs, limit, skip, keyGenerator }: LimiterOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    skip: skip ?? skipInTests,
    keyGenerator,
  })
}
