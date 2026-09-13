import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { logger } from '../lib/logger'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startTime: number
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID()
  req.startTime = Date.now()

  res.setHeader('X-Request-ID', req.requestId)

  const log = logger.child({ reqId: req.requestId })

  log.info({
    msg: 'request started',
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    params: req.params,
    ip: req.ip,
  })

  const originalEnd = res.end
  res.end = function (this: Response, chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) {
    const duration = Date.now() - req.startTime
    log.info({
      msg: 'request completed',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userId: req.userId,
    })
    return originalEnd.call(this, chunk, encoding as BufferEncoding, cb)
  } as Response['end']

  next()
}