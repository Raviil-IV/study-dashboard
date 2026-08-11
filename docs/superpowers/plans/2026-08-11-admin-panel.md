# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить админ-панель со статистикой по платформе и по пользователям, доступную только пользователям с ролью `admin` (роль в БД, выдаётся из панели).

**Architecture:** Колонка `role` в `users` (default `user`), middleware `requireAdmin` (поверх `requireAuth`, роль читается из БД). Новый роут `/api/admin/*`: список пользователей, смена роли, глобальная сводка, метрики пользователя — агрегация SQL-запросами в `backend/src/lib/stats.ts`. Фронтенд: страница `/admin` (защита `AdminRoute`), пункт «Админка» в навигации виден только админам, самописный SVG-график без новых зависимостей.

**Tech Stack:** Express 4, Drizzle ORM + PostgreSQL, zod, Vitest + Supertest (backend); React 19, Zustand, React Router 7, Vitest + Testing Library (frontend).

## Global Constraints

- Роль хранится в `users.role` (`text`, enum `user | admin`, default `user`); источник истины — БД, а не JWT.
- `requireAdmin` читает роль из БД на каждый запрос.
- `/api/auth/me`, `/api/auth/login`, `/api/auth/register` возвращают `{ id, login, role }`.
- Смена роли самому себе — `403` с кодом `SELF_ROLE_CHANGE`.
- Первый админ назначается вручную: `UPDATE users SET role = 'admin' WHERE login = '...';`.
- Все агрегации статистики — в PostgreSQL (SQL-запросами), не в JS.
- График — самописный SVG; **никаких новых npm-зависимостей** (ни в корне, ни в backend).
- Ошибки API — `{ error: { code, message } }`, тексты на русском.
- Коммиты — на английском, subject в повелительном наклонении (например `feat: add admin role column`).
- Тесты: `cd backend && npm test` требует PostgreSQL на `localhost:5432` (см. `backend/test/globalSetup.ts`); фронт — `npm test` из корня.
- Миграции применяются автоматически: в тестах — `globalSetup.ts`, в проде — `backend/src/index.ts` → `runMigrations()`.

---

### Task 1: Колонка `role` в таблице `users`

**Files:**
- Modify: `backend/src/db/schema.ts:16-21` (таблица `users`)
- Create (генерируется): `backend/drizzle/0002_*.sql`

**Interfaces:**
- Produces: у таблицы `users` появляется колонка `role: text('role', { enum: ['user', 'admin'] }).notNull().default('user')`. Drizzle-тип колонки: `'user' | 'admin'`.

- [ ] **Step 1: Добавить колонку в схему**

В `backend/src/db/schema.ts` в объект таблицы `users` (сразу после `login`) добавить:

```ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  login: text('login').unique().notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Сгенерировать миграцию**

Run: `cd backend && npx drizzle-kit generate`
Expected: создан файл `backend/drizzle/0002_<hash>_*.sql` вида:

```sql
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;
```

Проверить командой `git status --porcelain backend/drizzle` — появился один новый файл миграции и обновился `meta/_journal.json`.

- [ ] **Step 3: Прогнать существующие тесты backend (миграция применяется автоматически)**

Run: `cd backend && npm test`
Expected: все тесты проходят (новая колонка с default не ломает существующие INSERT без `role`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle
git commit -m "feat: add role column to users table"
```

---

### Task 2: Роль в ответах авторизации + middleware `requireAdmin`

**Files:**
- Modify: `backend/src/routes/auth.ts:30,45,62` (ответы register/login/me)
- Create: `backend/src/middleware/admin.ts`
- Modify: `backend/test/auth.test.ts` (добавить проверки `role` в ответах)

**Interfaces:**
- Produces: `requireAdmin(req, res, next)` — `void` (async). Отвечает `403 { error: { code: 'FORBIDDEN', message: 'Доступ запрещён' } }`, если роль не `admin`.
- Produces: все ответы auth-эндпоинтов содержат поле `role`.

- [ ] **Step 1: Написать падающие тесты**

Добавить в конец `backend/test/auth.test.ts` (внутри `describe('auth', ...)`):

```ts
it('returns role in /me response', async () => {
  const agent = createAgent()
  await signUp(agent, 'roleuser')
  const res = await agent.get('/api/auth/me')
  expect(res.status).toBe(200)
  expect(res.body.role).toBe('user')
})

it('returns role on login', async () => {
  const agent = createAgent()
  await signUp(agent, 'loginrole')
  const res = await agent.post('/api/auth/login').send({ login: 'loginrole', password: 'password123' })
  expect(res.status).toBe(200)
  expect(res.body.role).toBe('user')
})

it('returns role on register', async () => {
  const agent = createAgent()
  const res = await agent.post('/api/auth/register').send({ login: 'regrole', password: 'password123' })
  expect(res.status).toBe(201)
  expect(res.body.role).toBe('user')
})
```

- [ ] **Step 2: Запустить тесты — ожидаем FAIL**

Run: `cd backend && npx vitest run test/auth.test.ts`
Expected: FAIL — `res.body.role` равен `undefined`.

- [ ] **Step 3: Вернуть `role` в ответах**

В `backend/src/routes/auth.ts`:

- register (строка с `res.status(201).json(...)`):

```ts
res.status(201).json({ id: user.id, login: user.login, role: user.role })
```

- login:

```ts
res.json({ id: user.id, login: user.login, role: user.role })
```

- `/me` (строка с `res.json({ id: user.id, login: user.login })`):

```ts
res.json({ id: user.id, login: user.login, role: user.role })
```

- [ ] **Step 4: Создать middleware `requireAdmin`**

Создать `backend/src/middleware/admin.ts`:

```ts
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
```

- [ ] **Step 5: Запустить тесты — ожидаем PASS**

Run: `cd backend && npx vitest run test/auth.test.ts`
Expected: PASS (все тесты auth).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/middleware/admin.ts backend/test/auth.test.ts
git commit -m "feat: return role in auth responses, add requireAdmin middleware"
```

---

### Task 3: Admin API — список пользователей и смена роли

**Files:**
- Modify: `backend/src/lib/validation.ts` (схемы `roleParamSchema`, `userIdParamSchema`)
- Create: `backend/src/routes/admin.ts`
- Modify: `backend/src/app.ts:19-27` (монтирование роута)
- Modify: `backend/test/helpers.ts` (helper `promoteToAdmin`)
- Create: `backend/test/admin.test.ts`

**Interfaces:**
- Produces: `adminRouter` — Express Router:
  - `GET /users` → `AdminUserRow[]`, где `AdminUserRow = { id: string; login: string; role: 'user' | 'admin'; createdAt: string; taskCount: number; sessionCount: number }`
  - `PATCH /users/:id/role` body `{ role: 'user' | 'admin' }` → `{ id: string }` (200); `403` c кодом `SELF_ROLE_CHANGE` при смене роли самому себе; `404` c кодом `USER_NOT_FOUND`.
- Produces: `promoteToAdmin(login: string): Promise<void>` в `backend/test/helpers.ts`.
- Consumes: `requireAuth` + `requireAdmin` (монтируются в `app.ts` перед роутом).

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/test/helpers.ts` — добавить в конец:

```ts
import { eq } from 'drizzle-orm'
import { db } from '../src/db/client'
import { users } from '../src/db/schema'

export async function promoteToAdmin(login: string): Promise<void> {
  await db.update(users).set({ role: 'admin' }).where(eq(users.login, login))
}
```

Создать `backend/test/admin.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, promoteToAdmin, signUp } from './helpers'

describe('admin', () => {
  it('returns 401 without an auth cookie', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('returns 403 for a regular user', async () => {
    const agent = createAgent()
    await signUp(agent, 'regular')
    const res = await agent.get('/api/admin/users')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('lists users with counts for an admin', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const res = await agent.get('/api/admin/users')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ login: 'boss', role: 'admin', taskCount: 0, sessionCount: 0 })
  })

  it('changes role of another user', async () => {
    const admin = createAgent()
    await signUp(admin, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: reg } = await signUp(target, 'worker')
    const r = await admin.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'admin' })
    expect(r.status).toBe(200)
    const list = await admin.get('/api/admin/users')
    const row = list.body.find((u: { id: string }) => u.id === reg.body.id)
    expect(row.role).toBe('admin')
  })

  it('forbids changing own role', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'user' })
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('SELF_ROLE_CHANGE')
  })

  it('rejects an invalid role with 400', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const target = createAgent()
    const { res: reg } = await signUp(target, 'worker')
    const r = await agent.patch(`/api/admin/users/${reg.body.id}/role`).send({ role: 'superuser' })
    expect(r.status).toBe(400)
  })

  it('returns 404 for an unknown user', async () => {
    const agent = createAgent()
    await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    const r = await agent.patch('/api/admin/users/00000000-0000-0000-0000-000000000000/role').send({ role: 'admin' })
    expect(r.status).toBe(404)
    expect(r.body.error.code).toBe('USER_NOT_FOUND')
  })
})
```

- [ ] **Step 2: Запустить тесты — ожидаем FAIL**

Run: `cd backend && npx vitest run test/admin.test.ts`
Expected: FAIL — `GET /api/admin/users` возвращает 404 (роут не смонтирован).

- [ ] **Step 3: Добавить схемы валидации**

В `backend/src/lib/validation.ts` в конец добавить:

```ts
export const roleParamSchema = z.object({
  role: z.enum(['user', 'admin']),
})

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
})
```

- [ ] **Step 4: Реализовать роут `admin.ts`**

Создать `backend/src/routes/admin.ts`:

```ts
import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { count } from 'drizzle-orm'
import { db } from '../db/client'
import { focusSessions, tasks, users } from '../db/schema'
import { roleParamSchema, userIdParamSchema } from '../lib/validation'

export const adminRouter = Router()

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const [userRows, taskCounts, sessionCounts] = await Promise.all([
      db
        .select({ id: users.id, login: users.login, role: users.role, createdAt: users.createdAt })
        .from(users)
        .orderBy(desc(users.createdAt)),
      db.select({ userId: tasks.userId, n: count(tasks.id) }).from(tasks).groupBy(tasks.userId),
      db.select({ userId: focusSessions.userId, n: count(focusSessions.id) }).from(focusSessions).groupBy(focusSessions.userId),
    ])
    const taskMap = new Map(taskCounts.map((r) => [r.userId, Number(r.n)]))
    const sessionMap = new Map(sessionCounts.map((r) => [r.userId, Number(r.n)]))
    res.json(
      userRows.map((u) => ({
        ...u,
        taskCount: taskMap.get(u.id) ?? 0,
        sessionCount: sessionMap.get(u.id) ?? 0,
      })),
    )
  } catch (err) {
    next(err)
  }
})

adminRouter.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params)
    if (id === req.userId) {
      res.status(403).json({ error: { code: 'SELF_ROLE_CHANGE', message: 'Нельзя менять роль самому себе' } })
      return
    }
    const { role } = roleParamSchema.parse(req.body)
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({ id: users.id })
    if (!updated) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } })
      return
    }
    res.json(updated)
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Смонтировать роут в `app.ts`**

В `backend/src/app.ts`:

```ts
import { requireAdmin } from './middleware/admin'
import { adminRouter } from './routes/admin'
```

и после строки `app.use('/api/game-records', requireAuth, gameRecordsRouter)` добавить:

```ts
app.use('/api/admin', requireAuth, requireAdmin, adminRouter)
```

- [ ] **Step 6: Запустить тесты — ожидаем PASS**

Run: `cd backend && npx vitest run test/admin.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 7: Прогнать все тесты backend**

Run: `cd backend && npm test`
Expected: все тесты проходят.

- [ ] **Step 8: Commit**

```bash
git add backend/src/lib/validation.ts backend/src/routes/admin.ts backend/src/app.ts backend/test/helpers.ts backend/test/admin.test.ts
git commit -m "feat: add admin users list and role management API"
```

---

### Task 4: Admin API — глобальная статистика и тренд

**Files:**
- Create: `backend/src/lib/stats.ts`
- Modify: `backend/src/routes/admin.ts` (роут `GET /stats`)
- Create: `backend/test/adminStats.test.ts`

**Interfaces:**
- Produces из `backend/src/lib/stats.ts`:
  - `GlobalStats` — тип с полями: `totalUsers, newUsers7d, newUsers30d, activeUsers7d, activeUsers30d, focusMinutes7d, focusMinutes30d, avgSessionMinutes, tasksTotal, tasksDone, tasksDonePercent, tasksOverdue, deadlinesUpcoming7d, deadlinesOverdue, notesTotal, notesPerUser` (все `number`).
  - `TrendDay = { day: string; focusMinutes: number; tasksDone: number }`.
  - `getGlobalStats(): Promise<GlobalStats>`
  - `getTrend(userId: string | null): Promise<TrendDay[]>` — последние 30 дней включительно с текущим, дни без данных заполняются нулями.
- Consumes: `db` из `backend/src/db/client`, `sql` из `drizzle-orm`.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/test/adminStats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { db } from '../src/db/client'
import { focusSessions, tasks } from '../src/db/schema'
import { createAgent, promoteToAdmin, signUp } from './helpers'

describe('admin stats', () => {
  it('returns 403 for a regular user', async () => {
    const agent = createAgent()
    await signUp(agent, 'reguser')
    const res = await agent.get('/api/admin/stats')
    expect(res.status).toBe(403)
  })

  it('returns global aggregates', async () => {
    const agent = createAgent()
    const { res: regA } = await signUp(agent, 'boss')
    await promoteToAdmin('boss')
    await signUp(createAgent(), 'student')

    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await db.insert(tasks).values([
      {
        id: '11111111-1111-4111-8111-111111111111',
        userId: regA.body.id,
        title: 'done task',
        priority: 'medium',
        status: 'done',
        createdAt: yesterday,
        completedAt: yesterday,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        userId: regA.body.id,
        title: 'overdue task',
        priority: 'high',
        status: 'todo',
        dueDate: '2020-01-01',
        createdAt: yesterday,
      },
    ])
    await db.insert(focusSessions).values([
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId: regA.body.id,
        label: 'f',
        startedAt: yesterday,
        durationMinutes: 25,
        completed: true,
      },
    ])

    const res = await agent.get('/api/admin/stats')
    expect(res.status).toBe(200)
    const s = res.body
    expect(s.totalUsers).toBe(2)
    expect(s.newUsers30d).toBe(2)
    expect(s.focusMinutes7d).toBe(25)
    expect(s.focusMinutes30d).toBe(25)
    expect(s.tasksTotal).toBe(2)
    expect(s.tasksDone).toBe(1)
    expect(s.tasksDonePercent).toBe(50)
    expect(s.tasksOverdue).toBe(1)
    expect(s.activeUsers30d).toBe(1)
    expect(s.notesTotal).toBe(0)
    expect(s.trend).toHaveLength(30)
    expect(s.trend[29].focusMinutes).toBe(25)
    expect(s.trend[29].tasksDone).toBe(1)
  })
})
```

- [ ] **Step 2: Запустить тесты — ожидаем FAIL**

Run: `cd backend && npx vitest run test/adminStats.test.ts`
Expected: FAIL — `GET /api/admin/stats` возвращает 404.

- [ ] **Step 3: Реализовать агрегации в `stats.ts`**

Создать `backend/src/lib/stats.ts`:

```ts
import { sql } from 'drizzle-orm'
import { db } from '../db/client'

export interface TrendDay {
  day: string
  focusMinutes: number
  tasksDone: number
}

export interface GlobalStats {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  activeUsers7d: number
  activeUsers30d: number
  focusMinutes7d: number
  focusMinutes30d: number
  avgSessionMinutes: number
  tasksTotal: number
  tasksDone: number
  tasksDonePercent: number
  tasksOverdue: number
  deadlinesUpcoming7d: number
  deadlinesOverdue: number
  notesTotal: number
  notesPerUser: number
}

function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const [row] = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '30 days') AS new_users_30d,
      (SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM focus_sessions WHERE started_at >= now() - interval '7 days'
          UNION
          SELECT user_id FROM tasks WHERE created_at >= now() - interval '7 days' OR completed_at >= now() - interval '7 days'
        ) act7) AS active_users_7d,
      (SELECT count(DISTINCT user_id)::int FROM (
          SELECT user_id FROM focus_sessions WHERE started_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM tasks WHERE created_at >= now() - interval '30 days' OR completed_at >= now() - interval '30 days'
        ) act30) AS active_users_30d,
      (SELECT COALESCE(sum(duration_minutes), 0)::int FROM focus_sessions WHERE completed AND started_at >= now() - interval '7 days') AS focus_minutes_7d,
      (SELECT COALESCE(sum(duration_minutes), 0)::int FROM focus_sessions WHERE completed AND started_at >= now() - interval '30 days') AS focus_minutes_30d,
      (SELECT COALESCE(round(avg(duration_minutes)), 0)::int FROM focus_sessions WHERE completed) AS avg_session_minutes,
      (SELECT count(*)::int FROM tasks) AS tasks_total,
      (SELECT count(*)::int FROM tasks WHERE status = 'done') AS tasks_done,
      (SELECT count(*)::int FROM tasks WHERE status <> 'done' AND due_date < CURRENT_DATE) AS tasks_overdue,
      (SELECT count(*)::int FROM deadlines WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + 7) AS deadlines_upcoming_7d,
      (SELECT count(*)::int FROM deadlines WHERE date < CURRENT_DATE) AS deadlines_overdue,
      (SELECT count(*)::int FROM notes) AS notes_total
  `)
  const r = row as Record<string, number>
  const totalUsers = r.total_users
  const notesTotal = r.notes_total
  const tasksTotal = r.tasks_total
  const tasksDone = r.tasks_done
  return {
    totalUsers,
    newUsers7d: r.new_users_7d,
    newUsers30d: r.new_users_30d,
    activeUsers7d: r.active_users_7d,
    activeUsers30d: r.active_users_30d,
    focusMinutes7d: r.focus_minutes_7d,
    focusMinutes30d: r.focus_minutes_30d,
    avgSessionMinutes: r.avg_session_minutes,
    tasksTotal,
    tasksDone,
    tasksDonePercent: tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0,
    tasksOverdue: r.tasks_overdue,
    deadlinesUpcoming7d: r.deadlines_upcoming_7d,
    deadlinesOverdue: r.deadlines_overdue,
    notesTotal,
    notesPerUser: totalUsers > 0 ? Math.round((notesTotal / totalUsers) * 100) / 100 : 0,
  }
}

export async function getTrend(userId: string | null): Promise<TrendDay[]> {
  const scope = userId ? sql`WHERE user_id = ${userId}` : sql``
  const [focusRows, taskRows] = await Promise.all([
    db.execute(sql`
      SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
             COALESCE(sum(duration_minutes), 0)::int AS minutes
      FROM focus_sessions
      ${scope} AND completed AND started_at >= now() - interval '30 days'
      GROUP BY 1
    `),
    db.execute(sql`
      SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day,
             count(*)::int AS done
      FROM tasks
      ${scope} AND completed_at IS NOT NULL AND completed_at >= now() - interval '30 days'
      GROUP BY 1
    `),
  ])
  const byDay = new Map<string, TrendDay>()
  for (const r of focusRows as { day: string; minutes: number }[]) {
    byDay.set(r.day, { day: r.day, focusMinutes: r.minutes, tasksDone: 0 })
  }
  for (const r of taskRows as { day: string; done: number }[]) {
    const cur = byDay.get(r.day) ?? { day: r.day, focusMinutes: 0, tasksDone: 0 }
    cur.tasksDone = r.done
    byDay.set(r.day, cur)
  }
  const days: TrendDay[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = toIsoDate(d)
    days.push(byDay.get(key) ?? { day: key, focusMinutes: 0, tasksDone: 0 })
  }
  return days
}
```

- [ ] **Step 4: Добавить роут `GET /stats`**

В `backend/src/routes/admin.ts` добавить импорт и роут:

```ts
import { getGlobalStats, getTrend } from '../lib/stats'

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [stats, trend] = await Promise.all([getGlobalStats(), getTrend(null)])
    res.json({ ...stats, trend })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Запустить тесты — ожидаем PASS**

Run: `cd backend && npx vitest run test/adminStats.test.ts`
Expected: PASS (2 теста).

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/stats.ts backend/src/routes/admin.ts backend/test/adminStats.test.ts
git commit -m "feat: add admin global stats endpoint"
```

---

### Task 5: Admin API — статистика пользователя

**Files:**
- Modify: `backend/src/lib/stats.ts` (функция `getUserStats`)
- Modify: `backend/src/routes/admin.ts` (роут `GET /users/:id/stats`)
- Modify: `backend/test/adminStats.test.ts` (новые тесты)

**Interfaces:**
- Produces из `backend/src/lib/stats.ts`: `getUserStats(userId: string): Promise<UserStatsResult | null>`, где
  `UserStatsResult = { profile: { id: string; login: string; role: 'user' | 'admin'; createdAt: string }; focus: { totalSessions: number; totalMinutes: number; minutes30d: number }; tasks: { total: number; done: number; inProgress: number; overdue: number }; deadlines: { upcoming: number; overdue: number }; notes: { total: number }; games: { game: string; difficulty: string; bestValue: number }[]; activity: TrendDay[] }`.
  Возвращает `null`, если пользователь не найден.
- Consumes: `getTrend(userId)` из Task 4, `TrendDay` из Task 4.

- [ ] **Step 1: Написать падающие тесты**

Добавить в конец `backend/test/adminStats.test.ts` (внутрь `describe('admin stats', ...)`):

```ts
it('returns per-user stats', async () => {
  const agent = createAgent()
  const { res: regA } = await signUp(agent, 'boss')
  await promoteToAdmin('boss')
  const target = createAgent()
  const { res: regB } = await signUp(target, 'student')

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await db.insert(tasks).values([
    {
      id: '44444444-4444-4444-8444-444444444444',
      userId: regB.body.id,
      title: 'done task',
      priority: 'low',
      status: 'done',
      createdAt: yesterday,
      completedAt: yesterday,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      userId: regB.body.id,
      title: 'in progress',
      priority: 'high',
      status: 'in-progress',
      createdAt: yesterday,
    },
  ])
  await db.insert(focusSessions).values([
    {
      id: '66666666-6666-4666-8666-666666666666',
      userId: regB.body.id,
      label: 'f',
      startedAt: yesterday,
      durationMinutes: 50,
      completed: true,
    },
  ])

  const res = await agent.get(`/api/admin/users/${regB.body.id}/stats`)
  expect(res.status).toBe(200)
  const s = res.body
  expect(s.profile.login).toBe('student')
  expect(s.profile.role).toBe('user')
  expect(s.focus).toMatchObject({ totalSessions: 1, totalMinutes: 50, minutes30d: 50 })
  expect(s.tasks).toMatchObject({ total: 2, done: 1, inProgress: 1, overdue: 0 })
  expect(s.activity).toHaveLength(30)
  expect(s.activity[29].tasksDone).toBe(1)
})

it('returns 404 for an unknown user', async () => {
  const agent = createAgent()
  await signUp(agent, 'boss')
  await promoteToAdmin('boss')
  const res = await agent.get('/api/admin/users/00000000-0000-0000-0000-000000000000/stats')
  expect(res.status).toBe(404)
  expect(res.body.error.code).toBe('USER_NOT_FOUND')
})
```

- [ ] **Step 2: Запустить тесты — ожидаем FAIL**

Run: `cd backend && npx vitest run test/adminStats.test.ts`
Expected: FAIL — `GET /api/admin/users/:id/stats` возвращает 404.

- [ ] **Step 3: Реализовать `getUserStats`**

В `backend/src/lib/stats.ts` обновить импорты (добавить `eq` из `drizzle-orm` и `gameRecords`, `users` из `../db/schema`) и добавить в конец файла:

```ts
export interface UserStatsResult {
  profile: { id: string; login: string; role: 'user' | 'admin'; createdAt: string }
  focus: { totalSessions: number; totalMinutes: number; minutes30d: number }
  tasks: { total: number; done: number; inProgress: number; overdue: number }
  deadlines: { upcoming: number; overdue: number }
  notes: { total: number }
  games: { game: string; difficulty: string; bestValue: number }[]
  activity: TrendDay[]
}

export async function getUserStats(userId: string): Promise<UserStatsResult | null> {
  const [profile] = await db
    .select({ id: users.id, login: users.login, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
  if (!profile) return null

  const [focusRow, taskRow, deadlineRow, notesRow] = await Promise.all([
    db.execute(sql`
      SELECT count(*)::int AS sessions,
             COALESCE(sum(duration_minutes), 0)::int AS minutes,
             COALESCE(sum(duration_minutes) FILTER (WHERE started_at >= now() - interval '30 days'), 0)::int AS minutes_30d
      FROM focus_sessions WHERE user_id = ${userId}
    `),
    db.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE status = 'done')::int AS done,
             count(*) FILTER (WHERE status = 'in-progress')::int AS in_progress,
             count(*) FILTER (WHERE status <> 'done' AND due_date < CURRENT_DATE)::int AS overdue
      FROM tasks WHERE user_id = ${userId}
    `),
    db.execute(sql`
      SELECT count(*) FILTER (WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + 7)::int AS upcoming,
             count(*) FILTER (WHERE date < CURRENT_DATE)::int AS overdue
      FROM deadlines WHERE user_id = ${userId}
    `),
    db.execute(sql`SELECT count(*)::int AS total FROM notes WHERE user_id = ${userId}`),
  ])
  const [gameRows, activity] = await Promise.all([
    db
      .select({ game: gameRecords.game, difficulty: gameRecords.difficulty, bestValue: gameRecords.bestValue })
      .from(gameRecords)
      .where(eq(gameRecords.userId, userId)),
    getTrend(userId),
  ])
  const f = focusRow as Record<string, number>
  const t = taskRow as Record<string, number>
  const d = deadlineRow as Record<string, number>
  const n = notesRow as Record<string, number>
  return {
    profile,
    focus: { totalSessions: f.sessions, totalMinutes: f.minutes, minutes30d: f.minutes_30d },
    tasks: { total: t.total, done: t.done, inProgress: t.in_progress, overdue: t.overdue },
    deadlines: { upcoming: d.upcoming, overdue: d.overdue },
    notes: { total: n.total },
    games: gameRows,
    activity,
  }
}
```

- [ ] **Step 4: Добавить роут `GET /users/:id/stats`**

В `backend/src/routes/admin.ts` обновить импорт и добавить роут:

```ts
import { getUserStats } from '../lib/stats'

adminRouter.get('/users/:id/stats', async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params)
    const stats = await getUserStats(id)
    if (!stats) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' } })
      return
    }
    res.json(stats)
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Запустить тесты — ожидаем PASS**

Run: `cd backend && npx vitest run test/adminStats.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 6: Прогнать все тесты backend**

Run: `cd backend && npm test`
Expected: все тесты проходят.

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/stats.ts backend/src/routes/admin.ts backend/test/adminStats.test.ts
git commit -m "feat: add admin per-user stats endpoint"
```

---

### Task 6: Фронт — типы, `useAuth` с ролью, `AdminRoute`, маршрут `/admin`

**Files:**
- Modify: `src/types/index.ts` (типы `Role`, `User`)
- Create: `src/types/admin.ts` (типы ответов админ-API)
- Modify: `src/store/useAuth.ts` (поле `role` у `user`)
- Create: `src/components/layout/AdminRoute.tsx`
- Modify: `src/App.tsx` (маршрут `admin`)
- Modify: `src/App.test.tsx` (мок с `role: 'admin'`)
- Create: `src/components/layout/AdminRoute.test.tsx`

**Interfaces:**
- Produces:
  - `Role = 'user' | 'admin'`, `User = { id: string; login: string; role: Role }` в `src/types/index.ts`.
  - `AdminUser`, `AdminStats`, `TrendDay`, `AdminUserStats` в `src/types/admin.ts`.
  - `AdminRoute` — компонент: `{ children?: ReactNode }`, при `user.role !== 'admin'` — `<Navigate to="/" replace />`.
- Consumes: `useAuth` (заменяет инлайн-тип `{ id: string; login: string }` на `User`).

- [ ] **Step 1: Добавить типы**

В конец `src/types/index.ts` добавить:

```ts
export type Role = 'user' | 'admin'

export interface User {
  id: string
  login: string
  role: Role
}
```

Создать `src/types/admin.ts`:

```ts
import type { Role } from './index'

export interface AdminUser {
  id: string
  login: string
  role: Role
  createdAt: string
  taskCount: number
  sessionCount: number
}

export interface TrendDay {
  day: string
  focusMinutes: number
  tasksDone: number
}

export interface AdminStats {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  activeUsers7d: number
  activeUsers30d: number
  focusMinutes7d: number
  focusMinutes30d: number
  avgSessionMinutes: number
  tasksTotal: number
  tasksDone: number
  tasksDonePercent: number
  tasksOverdue: number
  deadlinesUpcoming7d: number
  deadlinesOverdue: number
  notesTotal: number
  notesPerUser: number
  trend: TrendDay[]
}

export interface AdminUserStats {
  profile: { id: string; login: string; role: Role; createdAt: string }
  focus: { totalSessions: number; totalMinutes: number; minutes30d: number }
  tasks: { total: number; done: number; inProgress: number; overdue: number }
  deadlines: { upcoming: number; overdue: number }
  notes: { total: number }
  games: { game: 'memory' | 'snake' | 'minesweeper'; difficulty: 'easy' | 'medium' | 'hard'; bestValue: number }[]
  activity: TrendDay[]
}
```

- [ ] **Step 2: Написать падающий тест `AdminRoute`**

Создать `src/components/layout/AdminRoute.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from './AdminRoute'
import { useAuth } from '../../store/useAuth'

beforeEach(() => {
  useAuth.setState({ user: null, status: 'authed' })
})

describe('AdminRoute', () => {
  it('renders children for an admin', () => {
    useAuth.setState({ user: { id: 'u1', login: 'boss', role: 'admin' }, status: 'authed' })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin panel</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Admin panel')).toBeInTheDocument()
  })

  it('redirects a regular user to the dashboard', () => {
    useAuth.setState({ user: { id: 'u2', login: 'user', role: 'user' }, status: 'authed' })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin panel</div>
              </AdminRoute>
            }
          />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Запустить тест — ожидаем FAIL**

Run: `npx vitest run src/components/layout/AdminRoute.test.tsx`
Expected: FAIL — `AdminRoute` не найден (cannot find module).

- [ ] **Step 4: Реализовать `AdminRoute` и типизировать `useAuth`**

Создать `src/components/layout/AdminRoute.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user)
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
```

В `src/store/useAuth.ts` заменить инлайн-тип пользователя:

```ts
import type { User } from '../types'

interface AuthState {
  user: User | null
  status: AuthStatus
  check: () => Promise<void>
  login: (login: string, password: string) => Promise<void>
  register: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

и все три вызова, устанавливающие пользователя, теперь принимают `{ id, login, role }` из ответа API (типы вызовов `api.get<{ id: string; login: string; role: Role }>` остаются корректными — `role` приходит с бэкенда после Task 2).

- [ ] **Step 5: Запустить тест — ожидаем PASS**

Run: `npx vitest run src/components/layout/AdminRoute.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 6: Обновить `App.test.tsx` (мок с ролью)**

В `src/App.test.tsx` обновить мок (добавить `role: 'admin'`):

```tsx
vi.mock('./store/useAuth', () => ({
  useAuth: (selector: (s: { user: { id: string; login: string; role: string } | null; status: string }) => unknown) =>
    selector({ user: { id: 'u1', login: 'alice', role: 'admin' }, status: 'authed' }),
}))
```

Маршрут `/admin` и импорт `AdminPage` добавляются в Task 9.

- [ ] **Step 7: Прогнать тесты фронта**

Run: `npm test`
Expected: все тесты проходят.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/types/admin.ts src/store/useAuth.ts src/components/layout/AdminRoute.tsx src/components/layout/AdminRoute.test.tsx src/App.test.tsx
git commit -m "feat: add admin route guard and role types"
```

---

### Task 7: Фронт — пункт «Админка» в навигации

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (пункт меню для админа)
- Modify: `src/components/layout/BottomNav.tsx` (то же для мобильной навигации)
- Create: `src/components/layout/AppLayout.test.tsx`

**Interfaces:**
- Produces: `ADMIN_NAV_ITEM`-подобный пункт `{ to: '/admin', label: 'Админка', icon: '🛡️' }`, рендерится только когда `user?.role === 'admin'`.
- Consumes: `useAuth` из Task 6.

- [ ] **Step 1: Написать падающий тест**

Создать `src/components/layout/AppLayout.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import { useAuth } from '../../store/useAuth'

beforeEach(() => {
  useAuth.setState({ user: null, status: 'authed' })
})

describe('AppLayout admin nav item', () => {
  it('shows the admin link for an admin user', () => {
    useAuth.setState({ user: { id: 'u1', login: 'boss', role: 'admin' }, status: 'authed' })
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('Админка').length).toBeGreaterThan(0)
  })

  it('hides the admin link for a regular user', () => {
    useAuth.setState({ user: { id: 'u2', login: 'user', role: 'user' }, status: 'authed' })
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Админка')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить тест — ожидаем FAIL**

Run: `npx vitest run src/components/layout/AppLayout.test.tsx`
Expected: FAIL — `queryByText('Админка')` не находит элемент в первом тесте.

- [ ] **Step 3: Реализовать пункт в `Sidebar`**

В `src/components/layout/Sidebar.tsx` после блока `NAV_ITEMS.map(...)` (перед `NavLink` «Настройки») добавить:

```tsx
{user?.role === 'admin' && (
  <NavLink
    to="/admin"
    className={({ isActive }) =>
      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
      }`
    }
  >
    <span className="text-base">🛡️</span>
    Админка
  </NavLink>
)}
```

- [ ] **Step 4: Реализовать пункт в `BottomNav`**

В `src/components/layout/BottomNav.tsx` — добавить `useAuth` и условный пункт после `NAV_ITEMS.map(...)`:

```tsx
import { useAuth } from '../../store/useAuth'

export default function BottomNav() {
  const user = useAuth((s) => s.user)
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
      {user?.role === 'admin' && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <span className="text-lg leading-none">🛡️</span>
          Админка
        </NavLink>
      )}
    </nav>
  )
}
```

- [ ] **Step 5: Запустить тест — ожидаем PASS**

Run: `npx vitest run src/components/layout/AppLayout.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx src/components/layout/AppLayout.test.tsx
git commit -m "feat: show admin link in navigation for admins"
```

---

### Task 8: Фронт — `ActivityChart` (самописный SVG)

**Files:**
- Create: `src/components/admin/ActivityChart.tsx`
- Create: `src/components/admin/ActivityChart.test.tsx`

**Interfaces:**
- Consumes: `TrendDay` из `src/types/admin.ts`.
- Produces: `ActivityChart({ data }: { data: TrendDay[] })` — рендерит `<svg>` с двумя сериями столбцов: фокус-минуты (indigo) и выполненные задачи (emerald); высота 160, ширина 100%. Пустые данные — `null`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/components/admin/ActivityChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ActivityChart from './ActivityChart'

const data = Array.from({ length: 30 }, (_, i) => ({
  day: `2026-01-${String(i + 1).padStart(2, '0')}`,
  focusMinutes: i % 5 === 0 ? 25 : 0,
  tasksDone: i % 3 === 0 ? 1 : 0,
}))

describe('ActivityChart', () => {
  it('renders two bars per day', () => {
    const { container } = render(<ActivityChart data={data} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('rect')).toHaveLength(60)
  })

  it('renders nothing for empty data', () => {
    const { container } = render(<ActivityChart data={[]} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить тест — ожидаем FAIL**

Run: `npx vitest run src/components/admin/ActivityChart.test.tsx`
Expected: FAIL — cannot find module `./ActivityChart`.

- [ ] **Step 3: Реализовать компонент**

Создать `src/components/admin/ActivityChart.tsx`:

```tsx
import type { TrendDay } from '../../types/admin'

const WIDTH = 100
const HEIGHT = 160
const PADDING = 4

function maxValue(data: TrendDay[]): number {
  const m = Math.max(...data.map((d) => Math.max(d.focusMinutes, d.tasksDone)))
  return m > 0 ? m : 1
}

export default function ActivityChart({ data }: { data: TrendDay[] }) {
  if (data.length === 0) return null
  const max = maxValue(data)
  const slot = WIDTH / data.length
  const barW = Math.max(1, slot * 0.35)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full" role="img" aria-label="Активность за 30 дней">
      {data.map((d, i) => {
        const x = i * slot + (slot - barW) / 2
        const hFocus = (d.focusMinutes / max) * (HEIGHT - PADDING * 2)
        const hTasks = (d.tasksDone / max) * (HEIGHT - PADDING * 2)
        return (
          <g key={d.day}>
            <rect x={x} y={HEIGHT - hFocus - PADDING} width={barW} height={Math.max(hFocus, 1)} className="fill-indigo-500" />
            <rect x={x + barW} y={HEIGHT - hTasks - PADDING} width={barW} height={Math.max(hTasks, 1)} className="fill-emerald-500" />
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Запустить тест — ожидаем PASS**

Run: `npx vitest run src/components/admin/ActivityChart.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ActivityChart.tsx src/components/admin/ActivityChart.test.tsx
git commit -m "feat: add SVG activity chart component"
```

---

### Task 9: Фронт — страница `/admin` и компоненты статистики

**Files:**
- Create: `src/pages/AdminPage.tsx`
- Create: `src/components/admin/StatsCards.tsx`
- Create: `src/components/admin/UsersTable.tsx`
- Create: `src/components/admin/UserStats.tsx`
- Create: `src/components/admin/RoleBadge.tsx`
- Create: `src/pages/AdminPage.test.tsx`
- Create: `src/components/admin/UsersTable.test.tsx`
- Modify: `src/App.tsx` (маршрут `admin`)

**Interfaces:**
- Consumes: `api` из `src/lib/api`, типы из `src/types/admin.ts`, `ActivityChart` из Task 8, `notifyError` из `src/lib/toast`.
- Produces:
  - `AdminPage` — страница: грузит `GET /admin/stats` и `GET /admin/users` параллельно, переключатель «Сводка / Пользователи», список пользователей, drill-down (`GET /admin/users/:id/stats`), смена роли (`PATCH /admin/users/:id/role`); при `403` — `navigate('/', { replace: true })` + тост.
  - `StatsCards({ stats }: { stats: AdminStats })` — карточки глобальной сводки.
  - `UsersTable({ users, onOpen, onToggleRole }: { users: AdminUser[]; onOpen: (u: AdminUser) => void; onToggleRole: (u: AdminUser) => void })`.
  - `UserStats({ stats, onBack }: { stats: AdminUserStats; onBack: () => void })`.
  - `RoleBadge({ role }: { role: Role })` — бейдж «Админ»/«Пользователь».

- [ ] **Step 1: Написать падающие тесты**

Создать `src/components/admin/RoleBadge.tsx` (тестируемый минимум) — реализация в шаге 3.

Создать `src/pages/AdminPage.test.tsx`:

```tsx
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from './AdminPage'
import { api } from '../lib/api'
import type { AdminStats, AdminUser } from '../types/admin'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const stats: AdminStats = {
  totalUsers: 2,
  newUsers7d: 1,
  newUsers30d: 2,
  activeUsers7d: 1,
  activeUsers30d: 2,
  focusMinutes7d: 25,
  focusMinutes30d: 50,
  avgSessionMinutes: 25,
  tasksTotal: 5,
  tasksDone: 2,
  tasksDonePercent: 40,
  tasksOverdue: 1,
  deadlinesUpcoming7d: 2,
  deadlinesOverdue: 0,
  notesTotal: 3,
  notesPerUser: 1.5,
  trend: [],
}

const users: AdminUser[] = [
  { id: 'u1', login: 'boss', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z', taskCount: 3, sessionCount: 5 },
  { id: 'u2', login: 'student', role: 'user', createdAt: '2026-02-01T00:00:00.000Z', taskCount: 1, sessionCount: 0 },
]

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.patch).mockReset()
  vi.mocked(api.get).mockResolvedValueOnce(stats).mockResolvedValueOnce(users)
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  it('renders global stats cards', async () => {
    renderPage()
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.getByText('Пользователей')).toBeInTheDocument()
  })

  it('switches to users tab and lists users', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Пользователи' }))
    expect(await screen.findByText('student')).toBeInTheDocument()
    expect(screen.getByText('boss')).toBeInTheDocument()
  })
})
```

Создать `src/components/admin/UsersTable.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersTable from './UsersTable'
import type { AdminUser } from '../../types/admin'

const users: AdminUser[] = [
  { id: 'u1', login: 'boss', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z', taskCount: 3, sessionCount: 5 },
  { id: 'u2', login: 'student', role: 'user', createdAt: '2026-02-01T00:00:00.000Z', taskCount: 1, sessionCount: 0 },
]

describe('UsersTable', () => {
  it('calls onToggleRole when the role button is clicked', async () => {
    const onToggleRole = vi.fn()
    const user = userEvent.setup()
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={onToggleRole} />)
    await user.click(screen.getAllByRole('button', { name: /Сделать админом|Снять админа/ })[0])
    expect(onToggleRole).toHaveBeenCalledWith(users[0])
  })
})
```

- [ ] **Step 2: Запустить тесты — ожидаем FAIL**

Run: `npx vitest run src/pages/AdminPage.test.tsx src/components/admin/UsersTable.test.tsx`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать компоненты**

Создать `src/components/admin/RoleBadge.tsx`:

```tsx
import type { Role } from '../../types'

export default function RoleBadge({ role }: { role: Role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
        Админ
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      Пользователь
    </span>
  )
}
```

Создать `src/components/admin/StatsCards.tsx`:

```tsx
import Card from '../ui/Card'
import type { AdminStats } from '../../types/admin'

export default function StatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    { label: 'Пользователей', value: stats.totalUsers },
    { label: 'Новых за 7 дней', value: stats.newUsers7d },
    { label: 'Активных за 30 дней', value: stats.activeUsers30d },
    { label: 'Фокус-минут за 30 дней', value: stats.focusMinutes30d },
    { label: 'Средняя сессия, мин', value: stats.avgSessionMinutes },
    { label: 'Задач выполнено, %', value: stats.tasksDonePercent },
    { label: 'Задач просрочено', value: stats.tasksOverdue },
    { label: 'Дедлайнов в ближайшие 7 дней', value: stats.deadlinesUpcoming7d },
    { label: 'Заметок', value: stats.notesTotal },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
        </Card>
      ))}
    </div>
  )
}
```

Создать `src/components/admin/UsersTable.tsx`:

```tsx
import Button from '../ui/Button'
import RoleBadge from './RoleBadge'
import type { AdminUser } from '../../types/admin'

export default function UsersTable({
  users,
  onOpen,
  onToggleRole,
}: {
  users: AdminUser[]
  onOpen: (u: AdminUser) => void
  onToggleRole: (u: AdminUser) => void
}) {
  if (users.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">Пользователей пока нет</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="pb-2 pr-3">Логин</th>
            <th className="pb-2 pr-3">Роль</th>
            <th className="pb-2 pr-3">Задач</th>
            <th className="pb-2 pr-3">Сессий</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{u.login}</td>
              <td className="py-2 pr-3">
                <RoleBadge role={u.role} />
              </td>
              <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{u.taskCount}</td>
              <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{u.sessionCount}</td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onOpen(u)}>
                    Открыть
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onToggleRole(u)}>
                    {u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Создать `src/components/admin/UserStats.tsx`:

```tsx
import Button from '../ui/Button'
import Card from '../ui/Card'
import ActivityChart from './ActivityChart'
import RoleBadge from './RoleBadge'
import type { AdminUserStats } from '../../types/admin'

export default function UserStats({ stats, onBack }: { stats: AdminUserStats; onBack: () => void }) {
  const s = stats
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.profile.login}</h2>
          <RoleBadge role={s.profile.role} />
        </div>
        <Button size="sm" variant="secondary" onClick={onBack}>
          ← Назад
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-2xl font-bold">{s.focus.totalMinutes}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Минут фокуса всего</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.focus.minutes30d}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Минут за 30 дней</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.tasks.done}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Задач выполнено</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.tasks.overdue}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Задач просрочено</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.deadlines.upcoming}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Дедлайнов впереди</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.notes.total}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Заметок</div>
        </Card>
      </div>
      <Card title="Активность за 30 дней">
        <ActivityChart data={s.activity} />
      </Card>
    </div>
  )
}
```

Создать `src/pages/AdminPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { notifyError } from '../lib/toast'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ActivityChart from '../components/admin/ActivityChart'
import StatsCards from '../components/admin/StatsCards'
import UsersTable from '../components/admin/UsersTable'
import UserStats from '../components/admin/UserStats'
import type { AdminStats, AdminUser, AdminUserStats } from '../types/admin'

type Tab = 'overview' | 'users'

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUserStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [statsData, usersData] = await Promise.all([api.get<AdminStats>('/admin/stats'), api.get<AdminUser[]>('/admin/users')])
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        notifyError(err)
        navigate('/', { replace: true })
        return
      }
      notifyError(err)
      setError('Не удалось загрузить данные')
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  const openUser = async (u: AdminUser) => {
    try {
      const data = await api.get<AdminUserStats>(`/admin/users/${u.id}/stats`)
      setSelected(data)
    } catch (err) {
      notifyError(err)
    }
  }

  const toggleRole = async (u: AdminUser) => {
    const role = u.role === 'admin' ? 'user' : 'admin'
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role })
      setUsers((list) => list.map((item) => (item.id === u.id ? { ...item, role } : item)))
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <div>
      <PageHeader title="Админ-панель" subtitle="Статистика платформы и управление ролями" />
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Обновить
          </Button>
        </div>
      )}
      {!selected && (
        <div className="mb-4 flex gap-2">
          <Button variant={tab === 'overview' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('overview')}>
            Сводка
          </Button>
          <Button variant={tab === 'users' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('users')}>
            Пользователи
          </Button>
        </div>
      )}
      {selected ? (
        <UserStats stats={selected} onBack={() => setSelected(null)} />
      ) : tab === 'overview' ? (
        <div className="space-y-4">
          {stats && <StatsCards stats={stats} />}
          {stats && stats.trend.length > 0 && (
            <Card title="Активность за 30 дней (фокус-минуты и задачи)">
              <ActivityChart data={stats.trend} />
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <UsersTable users={users} onOpen={(u) => void openUser(u)} onToggleRole={(u) => void toggleRole(u)} />
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Добавить маршрут в `App.tsx`**

В `src/App.tsx` — импорт и маршрут (внутри `AppLayout`, рядом с другими страницами):

```tsx
import AdminPage from './pages/AdminPage'
```

и после `<Route path="settings" element={<SettingsPage />} />`:

```tsx
<Route
  path="admin"
  element={
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  }
/>
```

- [ ] **Step 5: Запустить тесты — ожидаем PASS**

Run: `npx vitest run src/pages/AdminPage.test.tsx src/components/admin/UsersTable.test.tsx`
Expected: PASS.

- [ ] **Step 6: Прогнать все тесты фронта**

Run: `npm test`
Expected: все тесты проходят.

- [ ] **Step 7: Commit**

```bash
git add src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx src/components/admin/UsersTable.tsx src/components/admin/UsersTable.test.tsx src/components/admin/StatsCards.tsx src/components/admin/UserStats.tsx src/components/admin/RoleBadge.tsx src/App.tsx
git commit -m "feat: add admin page with stats and role management"
```

---

### Task 10: README и финальная валидация

**Files:**
- Modify: `README.md` (раздел про админ-панель)

- [ ] **Step 1: Обновить README**

В `README.md` в конец раздела «Бэкенд (разработка)» добавить:

```markdown
## Админ-панель

Роль `admin` выдаётся в админ-панели (`/admin`) тем, кто уже админ. Первому администратору роль назначается вручную в БД:

```bash
psql "$DATABASE_URL" -c "UPDATE users SET role = 'admin' WHERE login = 'твой_логин';"
```

Доступ к `/api/admin/*` и странице `/admin` — только для роли `admin`; админ не может снять роль сам с себя.
```

(внутри блока кода вложенный ``` ``` нужно экранировать как `` ```` ```` `` — либо оформить SQL без вложенного блока.)

- [ ] **Step 2: Прогнать все тесты backend**

Run: `cd backend && npm test`
Expected: все тесты проходят.

- [ ] **Step 3: Прогнать все тесты фронтенда**

Run: `npm test`
Expected: все тесты проходят.

- [ ] **Step 4: Собрать фронтенд (проверка типов)**

Run: `npm run build`
Expected: сборка успешна (tsc + vite).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document admin panel and first admin setup"
```

## Self-Review

- **Покрытие спеки:** колонка `role` (Task 1), роль в ответах auth (Task 2), `requireAdmin` (Task 2), список пользователей и смена роли (Task 3), глобальная сводка + тренд (Task 4), метрики пользователя (Task 5), типы/`useAuth`/`AdminRoute` (Task 6), пункт меню (Task 7), SVG-график (Task 8), страница `/admin` с drill-down и сменой роли (Task 9), документация первого админа (Task 10). Все разделы спеки закрыты.
- **Placeholder scan:** в плане нет «TBD/TODO»; каждый шаг содержит полный код или команду с ожидаемым результатом.
- **Типы и имена:** `getGlobalStats`/`getTrend`/`getUserStats` из Task 4–5 используются в Task 4–5 роутах; типы `AdminStats`/`AdminUser`/`AdminUserStats`/`TrendDay`/`Role`/`User` определены в Task 6 и потребляются Task 8–9; `ActivityChart({ data })` из Task 8 используется в Task 9. Имена согласованы.
- **Тонкий момент:** в `stats.ts` дневной ключ тренда (JS `toIsoDate`) и `to_char(..., 'YYYY-MM-DD')` в SQL зависят от часового пояса сервера/клиента; в тестах используются метки времени «вчера», что делает проверку `trend[29]` устойчивой к границе дня в обычном случае. Для строгой границы дня можно в CI фиксировать TZ — не требуется для учебного проекта.
- **Доп. замечание:** админ-эндпоинты не отдают содержимое заметок/задач — только агрегаты (соответствует разделу «Вне объёма» спеки).
