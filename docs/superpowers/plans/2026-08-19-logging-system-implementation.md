# Logging System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement structured logging system for backend (Express/pino) and frontend (React/console wrapper) with JSON output to console.

**Architecture:** Backend uses pino for high-performance structured logging with request middleware. Frontend uses lightweight console wrapper with component-aware hook.

**Tech Stack:** pino, pino-pretty (dev), uuid (request IDs), React hooks

## Global Constraints

- Output to console only
- JSON structured logs
- Standard log levels: debug, info, warn, error
- TypeScript throughout
- No difference between dev/prod behavior

---

## Backend Tasks

### Task 1: Install pino and configure

**Files:**
- Modify: `backend/package.json`

**Steps:**

- [ ] Step 1: Install pino
```bash
cd backend && npm install pino
```

- [ ] Step 2: Install dev dependencies
```bash
cd backend && npm install -D @types/pino
```

- [ ] Step 3: Commit
```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add pino logging dependency"
```

---

### Task 2: Create backend logger

**Files:**
- Create: `backend/src/lib/logger.ts`

**Steps:**

- [ ] Step 1: Create logger module
```typescript
import pino from 'pino'

const level = process.env.LOG_LEVEL ?? 'debug'

export const logger = pino({
  level,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label }
    },
  },
})

export type Logger = typeof logger
```

- [ ] Step 2: Verify TypeScript compiles
```bash
cd backend && npx tsc --noEmit src/lib/logger.ts
```

- [ ] Step 3: Commit
```bash
git add backend/src/lib/logger.ts
git commit -m "feat: add pino logger module"
```

---

### Task 3: Create request logger middleware

**Files:**
- Create: `backend/src/middleware/requestLogger.ts`

**Steps:**

- [ ] Step 1: Create request logger
```typescript
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { logger } from '../lib/logger'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startTime: number
      userId?: string
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
  res.end = function (this: Response, ...args: unknown[]) {
    const duration = Date.now() - req.startTime
    log.info({
      msg: 'request completed',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userId: req.userId,
    })
    return originalEnd.apply(this, args)
  } as Response['end']

  next()
}
```

- [ ] Step 2: Verify TypeScript compiles
```bash
cd backend && npx tsc --noEmit src/middleware/requestLogger.ts
```

- [ ] Step 3: Commit
```bash
git add backend/src/middleware/requestLogger.ts
git commit -m "feat: add request logger middleware"
```

---

### Task 4: Integrate middleware in app

**Files:**
- Modify: `backend/src/app.ts`

**Steps:**

- [ ] Step 1: Add import and mount middleware
```typescript
import { requestLogger } from './middleware/requestLogger'
// ... existing imports

export const app = express()

app.disable('x-powered-by')
app.use(express.json())
app.use(cookieParser())
app.use(requestLogger) // Add after cookieParser, before routes

// ... existing routes
```

- [ ] Step 2: Verify TypeScript compiles
```bash
cd backend && npx tsc --noEmit src/app.ts
```

- [ ] Step 3: Commit
```bash
git add backend/src/app.ts
git commit -m "feat: mount request logger in Express app"
```

---

### Task 5: Add logger to routes

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/routes/entities.ts`
- Modify: `backend/src/routes/gameRecords.ts`
- Modify: `backend/src/routes/settings.ts`

**Steps:**

- [ ] Step 1: Add logger to auth routes
```typescript
import { logger } from '../lib/logger'
const log = logger.child({ module: 'auth' })

// In register route success:
log.info({ userId: user.id, login }, 'user registered')

// In login route success:
log.info({ userId: user.id, login }, 'user logged in')

// In login failure:
log.warn({ login }, 'invalid credentials')
```

- [ ] Step 2: Add logger to entities routes (modify createEntityRouter)
```typescript
import { logger } from '../lib/logger'

export function createEntityRouter(table: AnyPgTable, schema: ZodTypeAny): Router {
  const log = logger.child({ module: table[Symbol.for('drizzle:Name')] })
  // ... existing code

  // In POST handler:
  log.info({ userId: req.userId }, 'created entity')

  // In PATCH handler:
  log.info({ userId: req.userId, entityId: req.params.id }, 'updated entity')

  // In DELETE handler:
  log.info({ userId: req.userId, entityId: req.params.id }, 'deleted entity')
}
```

- [ ] Step 3: Verify TypeScript compiles
```bash
cd backend && npx tsc --noEmit
```

- [ ] Step 4: Commit
```bash
git add backend/src/routes/
git commit -m "feat: add child loggers to route handlers"
```

---

### Task 6: Update error handler

**Files:**
- Modify: `backend/src/middleware/error.ts`

**Steps:**

- [ ] Step 1: Update error handler to use logger
```typescript
import { logger } from '../lib/logger'
const log = logger.child({ module: 'error' })

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
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Что-то пошло не так' } })
}
```

- [ ] Step 2: Verify TypeScript compiles
```bash
cd backend && npx tsc --noEmit
```

- [ ] Step 3: Commit
```bash
git add backend/src/middleware/error.ts
git commit -m "feat: integrate pino in error handler"
```

---

## Frontend Tasks

### Task 7: Create frontend logger

**Files:**
- Create: `src/lib/logger.ts`

**Steps:**

- [ ] Step 1: Create logger class
```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel = 
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? 
  (import.meta.env.DEV ? 'debug' : 'warn')

export class Logger {
  private component: string

  constructor(component: string) {
    this.component = component
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const entry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      component: this.component,
    }

    const consoleMethod = level === 'error' ? 'error' 
      : level === 'warn' ? 'warn' 
      : 'log'

    console[consoleMethod](JSON.stringify(entry))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
  }
}

export function createLogger(component: string): Logger {
  return new Logger(component)
}
```

- [ ] Step 2: Verify TypeScript compiles
```bash
cd frontend && npx tsc --noEmit src/lib/logger.ts
```

- [ ] Step 3: Commit
```bash
git add src/lib/logger.ts
git commit -m "feat: add frontend logger with structured output"
```

---

### Task 8: Create useLogger hook

**Files:**
- Create: `src/hooks/useLogger.ts`

**Steps:**

- [ ] Step 1: Create hook
```typescript
import { useRef } from 'react'
import { Logger, createLogger } from '../lib/logger'

export function useLogger(component: string): Logger {
  const loggerRef = useRef<Logger | null>(null)
  
  if (!loggerRef.current) {
    loggerRef.current = createLogger(component)
  }
  
  return loggerRef.current
}
```

- [ ] Step 2: Commit
```bash
git add src/hooks/useLogger.ts
git commit -m "feat: add useLogger hook for component logging"
```

---

### Task 9: Create fetch wrapper with logging

**Files:**
- Create: `src/lib/api.ts`

**Steps:**

- [ ] Step 1: Create API client with logging
```typescript
import { createLogger } from './logger'

const log = createLogger('API')

export interface ApiOptions extends RequestInit {
  json?: unknown
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, ...fetchOptions } = options

  log.debug(`request: ${fetchOptions.method ?? 'GET'} ${path}`)

  const res = await fetch(path, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body?.error?.message ?? res.statusText
    const code = body?.error?.code ?? 'UNKNOWN'
    
    log.warn('request failed', { status: res.status, code, message })
    throw new ApiError(res.status, code, message)
  }

  log.debug(`request completed: ${res.status}`)
  
  if (res.status === 204) return undefined as T
  return res.json()
}
```

- [ ] Step 2: Commit
```bash
git add src/lib/api.ts
git commit -m "feat: add API client with request/response logging"
```

---

### Task 10: Add logging to key components

**Files:**
- Modify: `src/pages/Login.tsx` (or similar auth component)
- Modify: `src/pages/Register.tsx` (or similar)

**Steps:**

- [ ] Step 1: Add logging to auth components
```typescript
import { useLogger } from '../hooks/useLogger'

export function Login() {
  const log = useLogger('Login')

  const handleSubmit = async (data: LoginForm) => {
    log.info('login attempt', { login: data.login })
    try {
      await api('/api/auth/login', { method: 'POST', json: data })
      log.info('login successful')
    } catch (err) {
      log.error('login failed', { error: err.message })
    }
  }
}
```

- [ ] Step 2: Commit
```bash
git add src/pages/
git commit -m "feat: add logging to auth pages"
```

---

### Task 11: Add logging to Zustand store

**Files:**
- Modify: `src/store/` (main store file)

**Steps:**

- [ ] Step 1: Add logger to store actions
```typescript
import { createLogger } from '../lib/logger'

const log = createLogger('Store')

// In significant actions:
export const useStore = create<StoreState>((set) => ({
  addTask: (task) => {
    log.info('task added', { taskId: task.id })
    set((state) => ({ tasks: [...state.tasks, task] }))
  },
  // ...
}))
```

- [ ] Step 2: Commit
```bash
git add src/store/
git commit -m "feat: add logging to Zustand store actions"
```

---

## Testing Tasks

### Task 12: Write tests for backend logger

**Files:**
- Create: `backend/test/logger.test.ts`

**Steps:**

- [ ] Step 1: Create logger tests
```typescript
import { describe, it, expect, vi } from 'vitest'
import { logger } from '../src/lib/logger'

describe('Logger', () => {
  it('should have correct default level', () => {
    expect(logger.level).toBe('debug')
  })

  it('should log messages', () => {
    const spy = vi.spyOn(logger, 'info')
    logger.info({ test: true }, 'test message')
    expect(spy).toHaveBeenCalled()
  })
})
```

- [ ] Step 2: Run tests
```bash
cd backend && npm test
```

- [ ] Step 3: Commit
```bash
git add backend/test/logger.test.ts
git commit -m "test: add backend logger tests"
```

---

### Task 13: Write tests for frontend logger

**Files:**
- Create: `src/test/logger.test.ts`

**Steps:**

- [ ] Step 1: Create logger tests
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Logger, createLogger } from '../lib/logger'

describe('Logger', () => {
  let logger: Logger

  beforeEach(() => {
    logger = createLogger('TestComponent')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should create logger with component name', () => {
    expect(logger).toBeDefined()
  })

  it('should log info messages', () => {
    logger.info('test message', { key: 'value' })
    expect(console.log).toHaveBeenCalled()
  })

  it('should log warn messages', () => {
    logger.warn('warning message')
    expect(console.warn).toHaveBeenCalled()
  })

  it('should log error messages', () => {
    logger.error('error message')
    expect(console.error).toHaveBeenCalled()
  })
})
```

- [ ] Step 2: Run tests
```bash
cd frontend && npm test
```

- [ ] Step 3: Commit
```bash
git add src/test/logger.test.ts
git commit -m "test: add frontend logger tests"
```

---

## Validation Tasks

### Task 14: End-to-end validation

**Steps:**

- [ ] Step 1: Start backend
```bash
cd backend && npm run dev
```

- [ ] Step 2: Start frontend
```bash
cd frontend && npm run dev
```

- [ ] Step 3: Verify logs appear in console
- Login attempt → auth logs appear
- CRUD operations → entity logs appear
- Errors → error logs with stack traces

- [ ] Step 4: Verify request IDs in response headers
```bash
curl -v http://localhost:3000/api/auth/me
```

- [ ] Step 5: Clean up and commit
```bash
git add -A
git commit -m "chore: validate logging system works end-to-end"
```