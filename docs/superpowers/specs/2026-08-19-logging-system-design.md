# Logging System Design

> **Project:** Study Dashboard  
> **Date:** 2026-08-19  
> **Status:** Approved for Implementation

---

## Goal

Implement a structured logging system for both backend (Express) and frontend (React) that outputs JSON-formatted logs to console with standard log levels (debug, info, warn, error).

---

## Architecture

### Backend (Express + TypeScript)

**Library:** `pino` — fast, structured JSON logger with minimal overhead (~5x faster than Winston)

**Components:**
1. **Core logger** (`backend/src/lib/logger.ts`) — configured pino instance
2. **Request middleware** (`backend/src/middleware/requestLogger.ts`) — logs HTTP requests/responses
3. **Integration** — mounted in `app.ts` before routes

**Features:**
- JSON output to stdout
- Request ID generation (UUID v4) per request, returned in `X-Request-ID` header
- Automatic error serialization with stack traces
- Child loggers per module: `logger.child({ module: 'auth' })`
- Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- Default level: `debug` (controllable via `LOG_LEVEL` env var)

### Frontend (React + TypeScript)

**Approach:** Lightweight wrapper around `console` with structured output

**Components:**
1. **Logger class** (`src/lib/logger.ts`) — level filtering, formatting, context enrichment
2. **React hook** (`src/hooks/useLogger.ts`) — component-scoped logger with auto-context

**Features:**
- Log levels: `debug`, `info`, `warn`, `error`
- Default level: `debug` in development, `warn` in production (via `VITE_LOG_LEVEL`)
- Structured log objects: `{ level, message, context, timestamp, component }`
- Component-aware: `useLogger('TaskList')` auto-includes component name
- Extensible for future remote logging

---

## Log Format

### Backend (pino JSON)
```json
{
  "level": 30,
  "time": 1724089200123,
  "pid": 12345,
  "hostname": "server-1",
  "req": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "method": "POST",
    "url": "/api/tasks",
    "query": {},
    "params": {},
    "headers": { "user-agent": "...", "content-type": "application/json" },
    "remoteAddress": "::1",
    "remotePort": 12345
  },
  "res": {
    "statusCode": 201,
    "responseTime": 45
  },
  "msg": "request completed",
  "module": "tasks"
}
```

### Frontend (structured console)
```json
{
  "level": "info",
  "message": "Task created",
  "context": { "taskId": "123", "title": "Study React" },
  "timestamp": "2026-08-19T12:00:00.123Z",
  "component": "TaskForm"
}
```

---

## Automatic Logging Integration Points

### Backend

| Area | Events Logged |
|------|---------------|
| **HTTP** | Every request + response (method, path, status, duration, userId, requestId) |
| **Auth** | Login success/failure, register, logout, token validation failures |
| **CRUD** | Create/update/delete for all entities (lessons, tasks, deadlines, notes, focus-sessions, game-records, settings) |
| **Errors** | All errors caught by error handler with stack trace |
| **Database** | Slow queries (>100ms) — optional, via Drizzle logger |

### Frontend

| Area | Events Logged |
|------|---------------|
| **API calls** | Request/response via fetch wrapper (optional) |
| **Auth** | Login, logout, token refresh |
| **User actions** | Form submissions, deletions, navigation |
| **Errors** | Caught errors in error boundaries / try-catch |
| **State changes** | Significant Zustand store mutations |

---

## Configuration

### Backend Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `debug` | Minimum level to log (trace/debug/info/warn/error/fatal) |
| `NODE_ENV` | `development` | Affects pretty-print vs JSON (we use JSON always per req #6) |

### Frontend Environment Variables
| Variable | Default (dev) | Default (prod) | Description |
|----------|---------------|----------------|-------------|
| `VITE_LOG_LEVEL` | `debug` | `warn` | Minimum level to log |

---

## Implementation Plan Summary

### Backend Tasks
1. Install `pino` and `pino-pretty` (dev only)
2. Create `backend/src/lib/logger.ts` — core logger factory
3. Create `backend/src/middleware/requestLogger.ts` — request/response logging
4. Update `backend/src/app.ts` — mount request logger, export logger for routes
5. Update routes to use child loggers (`logger.child({ module: 'auth' })`)
6. Update error middleware to log errors via logger

### Frontend Tasks
1. Create `src/lib/logger.ts` — Logger class with levels & formatting
2. Create `src/hooks/useLogger.ts` — React hook for component logging
3. Create `src/lib/api.ts` (or update) — fetch wrapper with request logging
4. Integrate in key components (auth, forms, error boundaries)

---

## Acceptance Criteria

- [ ] Backend logs all HTTP requests as JSON to console
- [ ] Backend logs errors with stack traces
- [ ] Backend includes request ID in logs and response header
- [ ] Frontend logs structured objects with component context
- [ ] Log levels controllable via environment variables
- [ ] No performance regression (pino is async, minimal overhead)
- [ ] TypeScript types exported for both loggers