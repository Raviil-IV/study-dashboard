# Backend + Auth + Multi-device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить Study Dashboard из localStorage-приложения в серверное: PostgreSQL + Express-бэкенд с JWT-авторизацией, вход/регистрация, синхронизация данных с разных устройств, деплой на VPS через Docker Compose.

**Architecture:** Три контейнера: `postgres` (данные), `backend` (Express + Drizzle, порт 3000, наружу не публикуется), `frontend` (nginx раздаёт статику и проксирует `/api` на backend). Авторизация — JWT в httpOnly-куке. Фронтенд работает по принципу optimistic updates: локальный стор обновляется мгновенно, параллельно шлётся запрос на сервер, при ошибке — откат и тост.

**Tech Stack:** Node.js 22 + Express 4 + TypeScript, Drizzle ORM + `pg`, PostgreSQL 17, zod, bcrypt, jsonwebtoken, cookie-parser, express-rate-limit; Vitest + Supertest; фронтенд — React 19 + Zustand (без persist).

## Global Constraints

- Пользовательский интерфейс и сообщения об ошибках — **на русском**.
- Все идентификаторы записей — **UUID v4, генерирует клиент** (`crypto.randomUUID()` через `uid()` из `src/lib/id.ts`); сервер валидирует формат (`z.string().uuid()`). Это отклонение от первоначальной формулировки спеки («id генерирует сервер») — принято осознанно, чтобы оптимистичные обновления не требовали подмены временных id; спека обновляется отдельным коммитом в начале работ.
- Клиент всегда отправляет полный объект сущности (с `id`, `createdAt` и т.д.); сервер валидирует и сохраняет как есть.
- Имена колонок БД — `snake_case`; JSON-ключи API — `camelCase` (совпадают с типами фронтенда).
- Времена — `varchar(5)` формата `HH:MM` (не `time`), чтобы контракт с фронтендом был точным.
- Даты `date` — строка `YYYY-MM-DD`; `timestamptz` в режиме `'string'` (ISO-строка, парсится JS).
- Rate limiting включён **только в production** (`skip: () => process.env.NODE_ENV !== 'production'`), иначе тесты и dev падают из-за лимита в 10 запросов с одного IP.
- Демо-данные и persist-localStorage из приложения **удаляются**; новый аккаунт стартует с пустыми коллекциями.
- `settings` и `gameRecords` на фронтенде обновляются только после подтверждения сервером; сущности — оптимистично.
- Пароль: минимум 8 символов (клиент и сервер).
- Кука: имя `sd_token`, `httpOnly`, `sameSite: 'lax'`, `secure` только при `NODE_ENV=production`, срок 7 дней.
- Команды тестов/сборки выполняются из соответствующих каталогов (`backend/` или корень). Тесты бэкенда требуют запущенный PostgreSQL на `localhost:5432` (см. Task 1).

---

## Часть A. Бэкенд

### Task 1: Каркас бэкенд-проекта

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.dockerignore`
- Create: `backend/.gitignore`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/types/express.d.ts`

**Interfaces:**
- Consumes: ничего (стартовая точка).
- Produces: каталог `backend/`, npm-скрипты `dev/build/start/test`, команда установки зависимостей. Отсюда запускаются все последующие backend-задачи.

- [ ] **Step 1: Создать каталог и файлы**

Создать `backend/` и в нём:

`backend/package.json`:

```json
{
  "name": "study-dashboard-backend",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.7",
    "drizzle-orm": "^0.44.2",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.8",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.13.0",
    "@types/pg": "^8.11.10",
    "@types/supertest": "^6.0.2",
    "drizzle-kit": "^0.31.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "~5.8.0",
    "vitest": "^3.1.0"
  }
}
```

`backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

`backend/.dockerignore`:

```
node_modules
dist
test
*.tsbuildinfo
.env
```

`backend/.gitignore`:

```
node_modules
dist
.env
```

`backend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/globalSetup.ts',
    setupFiles: ['./test/setup.ts'],
    env: {
      TEST_DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/study_dashboard_test',
    },
  },
})
```

`backend/src/types/express.d.ts` — расширение `Request` полем `userId`:

```ts
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

export {}
```

- [ ] **Step 2: Установить зависимости**

Run: `npm install` (в `backend/`)
Expected: пакеты установлены, `package-lock.json` создан.

- [ ] **Step 3: Поднять локальный PostgreSQL для тестов**

Run: `docker run -d --name sd-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17-alpine`
Expected: контейнер запущен; `docker exec sd-postgres pg_isready -U postgres` отвечает `accepting connections`. (Если Docker Desktop недоступен — установить PostgreSQL 17 локально с теми же кредами `postgres/postgres` на `5432`.)

- [ ] **Step 4: Проверить сборку пустого проекта**

Run: `npx tsc --noEmit` (в `backend/`)
Expected: ошибок нет (компилятор ещё нечего проверять — только d.ts).

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "Add backend project scaffold"
```

---

### Task 2: Схема БД (Drizzle) и начальная миграция

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/drizzle.config.ts`
- Create: `backend/drizzle/` (сгенерировано)

**Interfaces:**
- Consumes: Task 1 (каталог `backend/`).
- Produces: экспорты `users`, `lessons`, `tasks`, `deadlines`, `notes`, `focusSessions`, `settings`, `gameRecords` из `src/db/schema.ts` — все таблицы имеют колонки `id` и `userId` (кроме `users` и `settings`, где PK — `users.id` / `settings.userId`). Используются всеми роутами.

- [ ] **Step 1: Написать схему**

`backend/src/db/schema.ts`:

```ts
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamptz,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamptz('created_at', { mode: 'string' }).notNull().defaultNow(),
})

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type', { enum: ['weekly', 'once'] }).notNull(),
    weekday: smallint('weekday').notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    endTime: varchar('end_time', { length: 5 }).notNull(),
    date: date('date'),
    location: text('location'),
    note: text('note'),
    color: varchar('color', { length: 20 }),
  },
  (t) => [index('lessons_user_idx').on(t.userId)],
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subject: text('subject'),
    description: text('description'),
    dueDate: date('due_date'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull(),
    status: text('status', { enum: ['todo', 'in-progress', 'done'] }).notNull(),
    createdAt: timestamptz('created_at', { mode: 'string' }).notNull().defaultNow(),
    completedAt: timestamptz('completed_at', { mode: 'string' }),
  },
  (t) => [index('tasks_user_idx').on(t.userId)],
)

export const deadlines = pgTable(
  'deadlines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: text('type', { enum: ['exam', 'test', 'project', 'homework', 'other'] }).notNull(),
    subject: text('subject'),
    date: date('date').notNull(),
    time: varchar('time', { length: 5 }),
    note: text('note'),
    createdAt: timestamptz('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('deadlines_user_idx').on(t.userId)],
)

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    subject: text('subject'),
    content: text('content').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamptz('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamptz('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('notes_user_idx').on(t.userId)],
)

export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    subject: text('subject'),
    startedAt: timestamptz('started_at', { mode: 'string' }).notNull().defaultNow(),
    durationMinutes: smallint('duration_minutes').notNull(),
    completed: boolean('completed').notNull().default(false),
  },
  (t) => [index('focus_sessions_user_idx').on(t.userId)],
)

export const settings = pgTable('settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  pomodoroWorkMinutes: smallint('pomodoro_work_minutes').notNull().default(25),
  pomodoroShortBreakMinutes: smallint('pomodoro_short_break_minutes').notNull().default(5),
  pomodoroLongBreakMinutes: smallint('pomodoro_long_break_minutes').notNull().default(15),
})

export const gameRecords = pgTable(
  'game_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    game: text('game', { enum: ['memory', 'snake', 'minesweeper'] }).notNull(),
    difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull(),
    bestValue: integer('best_value').notNull(),
  },
  (t) => [uniqueIndex('game_records_user_game_difficulty_idx').on(t.userId, t.game, t.difficulty)],
)
```

`backend/drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
```

- [ ] **Step 2: Сгенерировать миграцию**

Run: `npx drizzle-kit generate --name init` (в `backend/`)
Expected: создан `backend/drizzle/0000_init.sql` с `CREATE TABLE` для всех 8 таблиц и индексами.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle.config.ts backend/drizzle
git commit -m "Add Drizzle schema and initial migration"
```

---

### Task 3: Клиент БД и раннер миграций + подготовка тестовой БД

**Files:**
- Create: `backend/src/db/client.ts`
- Create: `backend/src/db/migrate.ts`
- Create: `backend/test/globalSetup.ts`
- Create: `backend/test/setup.ts`
- Create: `backend/test/helpers.ts`

**Interfaces:**
- Consumes: Task 1 (vitest config, зависимости), Task 2 (`schema.ts`, миграции).
- Produces:
  - `db` — инстанс Drizzle (`drizzle-orm/node-postgres`), используемый всеми роутами: `import { db } from '../db/client'`.
  - `runMigrations()` — применяет миграции из `backend/drizzle` (вызывается в `index.ts` и в тестах).
  - `TEST_DATABASE_URL` — соединение с тестовой БД `study_dashboard_test` (создаётся автоматически).
  - `createAgent()` / `signUp(agent, email?, password?)` — хелперы интеграционных тестов (возвращают `{ res, email, password }`).

- [ ] **Step 1: Написать клиент и мигратор**

`backend/src/db/client.ts` — тесты подключаются к тестовой БД, продакшен — к основной:

```ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

export const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/study_dashboard'

export const pool = new Pool({ connectionString })

export const db = drizzle(pool)
```

`backend/src/db/migrate.ts`:

```ts
import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client'

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') })
}
```

- [ ] **Step 2: Написать подготовку тестовой БД**

`backend/test/globalSetup.ts` — создаёт тестовую БД (если нет) и применяет миграции:

```ts
import path from 'node:path'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

export default async function globalSetup(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/study_dashboard_test'
  const url = new URL(testUrl)
  const dbName = url.pathname.slice(1)

  const admin = new Pool({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: url.username || 'postgres',
    password: url.password || undefined,
    database: 'postgres',
  })
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
  if (rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  const db = drizzle(new Pool({ connectionString: testUrl }))
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'drizzle') })
  await db.$client.end()
}
```

`backend/test/setup.ts` — очистка всех таблиц перед каждым тестом:

```ts
import { beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '../src/db/client'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE lessons, tasks, deadlines, notes, focus_sessions, settings, game_records, users RESTART IDENTITY CASCADE`,
  )
})
```

`backend/test/helpers.ts`:

```ts
import request from 'supertest'
import { app } from '../src/app'

export function createAgent(): ReturnType<typeof request.agent> {
  return request.agent(app)
}

export async function signUp(
  agent: ReturnType<typeof request.agent>,
  email = `user${Math.random().toString(36).slice(2, 10)}@test.dev`,
  password = 'password123',
): Promise<{ res: request.Response; email: string; password: string }> {
  const res = await agent.post('/api/auth/register').send({ email, password })
  if (res.status !== 201) throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { res, email, password }
}
```

> Примечание: `helpers.ts` импортирует `app` из `src/app.ts` — файл появится в Task 11. Тесты запускаются полным прогоном начиная с Task 11; по одному (через `npx vitest run test/auth.test.ts`) — после создания `app.ts`.

- [ ] **Step 3: Проверить сборку**

Run: `npx tsc --noEmit` (в `backend/`)
Expected: ошибок нет (файлы `test/` вне `rootDir` и в сборку не входят; но TypeScript при этом их не проверяет — это нормально).

- [ ] **Step 4: Commit**

```bash
git add backend/src/db backend/test
git commit -m "Add DB client, migrations runner and test setup"
```

---

### Task 4: Zod-схемы валидации и дефолтные настройки

**Files:**
- Create: `backend/src/lib/validation.ts`
- Create: `backend/src/lib/defaults.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `registerSchema`, `loginSchema` — для роутов auth.
  - `lessonSchema`, `taskSchema`, `deadlineSchema`, `noteSchema`, `focusSessionSchema` — полные схемы сущностей (обязательное поле `id: z.string().uuid()`); `.partial()` применяется в generic-роутере для PATCH.
  - `settingsSchema`, `gameRecordSchema`.
  - `DEFAULT_SETTINGS` — `{ theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 }`.

- [ ] **Step 1: Написать схемы**

`backend/src/lib/validation.ts`:

```ts
import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Время должно быть в формате ЧЧ:ММ')

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(128, 'Пароль слишком длинный'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export const lessonSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1, 'Укажите название занятия'),
    type: z.enum(['weekly', 'once']),
    weekday: z.number().int().min(0).max(6),
    startTime: hhmm,
    endTime: hhmm,
    date: isoDate.optional(),
    location: z.string().trim().max(200).optional(),
    note: z.string().trim().max(2000).optional(),
    color: z.string().max(20).optional(),
  })
  .refine((l) => l.endTime > l.startTime, {
    message: 'Время конца должно быть позже времени начала',
    path: ['endTime'],
  })

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Укажите название задачи'),
  subject: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  dueDate: isoDate.optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in-progress', 'done']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
})

export const deadlineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Укажите название дедлайна'),
  type: z.enum(['exam', 'test', 'project', 'homework', 'other']),
  subject: z.string().trim().max(200).optional(),
  date: isoDate,
  time: hhmm.optional(),
  note: z.string().trim().max(2000).optional(),
  createdAt: z.string(),
})

export const noteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, 'Укажите название заметки'),
  subject: z.string().trim().max(200).optional(),
  content: z.string(),
  tags: z.array(z.string()).max(50).default([]),
  pinned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const focusSessionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(200).optional(),
  startedAt: z.string(),
  durationMinutes: z.number().int().min(1).max(600),
  completed: z.boolean(),
})

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  pomodoroWorkMinutes: z.number().int().min(1).max(120),
  pomodoroShortBreakMinutes: z.number().int().min(1).max(60),
  pomodoroLongBreakMinutes: z.number().int().min(1).max(120),
})

export const gameRecordSchema = z.object({
  game: z.enum(['memory', 'snake', 'minesweeper']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  value: z.number().int().min(0),
})
```

`backend/src/lib/defaults.ts`:

```ts
export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib
git commit -m "Add zod validation schemas and default settings"
```

---

### Task 5: Пароли, JWT, куки

**Files:**
- Create: `backend/src/lib/password.ts`
- Create: `backend/src/lib/jwt.ts`
- Create: `backend/src/lib/cookies.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `hashPassword(p: string): Promise<string>`, `verifyPassword(p: string, hash: string): Promise<boolean>`.
  - `signToken(userId: string): string`, `verifyToken(token: string): { userId: string }`.
  - `setAuthCookie(res, userId)`, `clearAuthCookie(res)` — имя куки `sd_token`.

- [ ] **Step 1: Написать модули**

`backend/src/lib/password.ts`:

```ts
import bcrypt from 'bcrypt'

const COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

`backend/src/lib/jwt.ts`:

```ts
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

export interface TokenPayload {
  userId: string
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload
}
```

`backend/src/lib/cookies.ts`:

```ts
import type { Response } from 'express'
import { signToken } from './jwt'

export const COOKIE_NAME = 'sd_token'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib
git commit -m "Add password hashing, JWT and cookie helpers"
```

---

### Task 6: Middleware — авторизация и обработка ошибок

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/error.ts`

**Interfaces:**
- Consumes: Task 4 (zod), Task 5 (`verifyToken`).
- Produces:
  - `requireAuth(req, res, next)` — читает куку, ставит `req.userId`, иначе `401 { error: { code: 'UNAUTHORIZED', message } }`.
  - `errorHandler(err, req, res, next)` — `ZodError` → `400`; нарушение уникальности PG (`23505`) → `409`; остальное → `500`; лог в консоль.

- [ ] **Step 1: Написать middleware**

`backend/src/middleware/auth.ts`:

```ts
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
```

`backend/src/middleware/error.ts`:

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middleware
git commit -m "Add auth and error-handling middleware"
```

---

### Task 7: Роуты авторизации + интеграционные тесты

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/test/auth.test.ts`

**Interfaces:**
- Consumes: Tasks 3–6 (`db`, `users`, zod-схемы, `hashPassword`/`verifyPassword`, `setAuthCookie`/`clearAuthCookie`, `requireAuth`).
- Produces: `authRouter` с `POST /register`, `POST /login`, `POST /logout`, `GET /me`. Rate limiting только в production (`skip: () => process.env.NODE_ENV !== 'production'`).

- [ ] **Step 1: Написать роуты**

`backend/src/routes/auth.ts`:

```ts
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { loginSchema, registerSchema } from '../lib/validation'
import { hashPassword, verifyPassword } from '../lib/password'
import { clearAuthCookie, setAuthCookie } from '../lib/cookies'
import { requireAuth } from '../middleware/auth'

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  skip: () => process.env.NODE_ENV !== 'production',
})

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body)
    const existing = await db.select().from(users).where(eq(users.email, email))
    if (existing.length > 0) {
      res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Пользователь с таким email уже существует' } })
      return
    }
    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({ email, passwordHash }).returning()
    setAuthCookie(res, user.id)
    res.status(201).json({ id: user.id, email: user.email })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Неверный email или пароль' } })
      return
    }
    setAuthCookie(res, user.id)
    res.json({ id: user.id, email: user.email })
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
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Пользователь не найден' } })
      return
    }
    res.json({ id: user.id, email: user.email })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 2: Написать тесты**

`backend/test/auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('auth', () => {
  it('registers a user and sets an auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@test.dev', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body.email).toBe('a@test.dev')
    expect(res.headers['set-cookie']?.join('')).toContain('sd_token')
  })

  it('rejects a duplicate email with 409', async () => {
    const agent = createAgent()
    await signUp(agent, 'dup@test.dev')
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@test.dev', password: 'password123' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rejects a short password with 400 and a Russian message', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'short@test.dev', password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('8 символов')
  })

  it('logs in with correct credentials', async () => {
    const agent = createAgent()
    await signUp(agent, 'login@test.dev')
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.dev', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('login@test.dev')
  })

  it('rejects a wrong password with 401', async () => {
    const agent = createAgent()
    await signUp(agent, 'wrong@test.dev')
    const res = await request(app).post('/api/auth/login').send({ email: 'wrong@test.dev', password: 'wrong-password' })
    expect(res.status).toBe(401)
  })

  it('requires auth for /me and returns the current user', async () => {
    const anon = await request(app).get('/api/auth/me')
    expect(anon.status).toBe(401)

    const agent = createAgent()
    const { email } = await signUp(agent, 'me@test.dev')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.email).toBe(email)
  })

  it('logs out and invalidates the session', async () => {
    const agent = createAgent()
    await signUp(agent, 'out@test.dev')
    await agent.post('/api/auth/logout')
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 3: Прогнать тесты (после создания app.ts в Task 11)**

Run: `npm test` (в `backend/`)
Expected: 7 тестов auth зелёные.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/auth.ts backend/test/auth.test.ts
git commit -m "Add auth routes with integration tests"
```

---

### Task 8: Generic CRUD-роутер для сущностей

**Files:**
- Create: `backend/src/routes/entities.ts`
- Create: `backend/test/entities.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4 (`db`, таблицы, zod-схемы).
- Produces: `createEntityRouter(table: AnyPgTable, schema: ZodTypeAny): Router` с маршрутами:
  - `POST /` — вставить запись (`userId` берётся из `req.userId`), ответ `201` + созданная строка;
  - `PATCH /:id` — обновить поля (`.partial()` от схемы), `404` если запись не принадлежит пользователю;
  - `DELETE /:id` — удалить, `204`, `404` если не найдена.
  - Все запросы фильтруются по `user_id` — изоляция между пользователями.

- [ ] **Step 1: Написать фабрику роутеров**

`backend/src/routes/entities.ts`:

```ts
import { Router, type NextFunction, type Request, type Response } from 'express'
import { and, eq } from 'drizzle-orm'
import type { AnyPgTable } from 'drizzle-orm/pg-core'
import { z, type ZodTypeAny } from 'zod'
import { db } from '../db/client'

const notFound = (res: Response) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } })

export function createEntityRouter(table: AnyPgTable, schema: ZodTypeAny): Router {
  const router = Router()
  const ids = { id: 'id', userId: 'userId' } as const

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body) as Record<string, unknown>
      const [row] = await db.insert(table).values({ ...parsed, userId: req.userId }).returning()
      res.status(201).json(row)
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partial = (schema as unknown as { partial: () => ZodTypeAny }).partial()
      const parsed = partial.parse(req.body) as Record<string, unknown>
      const [row] = await db
        .update(table)
        .set(parsed)
        .where(and(eq((table as Record<string, unknown>)[ids.id] as never, req.params.id), eq((table as Record<string, unknown>)[ids.userId] as never, req.userId)))
        .returning()
      if (!row) {
        notFound(res)
        return
      }
      res.json(row)
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .delete(table)
        .where(and(eq((table as Record<string, unknown>)[ids.id] as never, req.params.id), eq((table as Record<string, unknown>)[ids.userId] as never, req.userId)))
        .returning()
      if (rows.length === 0) {
        notFound(res)
        return
      }
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })

  return router
}
```

> Тип `ids` объявлен как `{ id: 'id'; userId: 'userId' }` — так `table['id']` и `table['userId']` типизируются по ключу, а не через `$inferSelect`. Если `tsc` всё же пожалуется на `as never` в `eq` — это ожидаемое приведение для generic-доступа к колонке; поведение не меняется.

- [ ] **Step 2: Написать тесты**

`backend/test/entities.test.ts` — CRUD + изоляция данных (пользователь A не может изменить/удалить записи B):

```ts
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

const lessonPayload = (id: string) => ({
  id,
  title: 'Математика',
  type: 'weekly' as const,
  weekday: 1,
  startTime: '09:00',
  endTime: '10:30',
})

describe('entities CRUD', () => {
  it('creates a lesson and returns it', async () => {
    const agent = createAgent()
    await signUp(agent, 'crud@test.dev')
    const id = randomUUID()
    const res = await agent.post('/api/lessons').send(lessonPayload(id))
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Математика')
    expect(res.body.userId).toBeTruthy()
  })

  it('rejects a lesson with invalid end time (400)', async () => {
    const agent = createAgent()
    await signUp(agent, 'invalid@test.dev')
    const res = await agent.post('/api/lessons').send({ ...lessonPayload(randomUUID()), endTime: '08:00' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain('Время конца')
  })

  it('patches a lesson owned by the user', async () => {
    const agent = createAgent()
    await signUp(agent, 'patch@test.dev')
    const id = randomUUID()
    await agent.post('/api/lessons').send(lessonPayload(id))
    const res = await agent.patch(`/api/lessons/${id}`).send({ title: 'Алгебра' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Алгебра')
  })

  it('returns 404 when patching a foreign lesson', async () => {
    const owner = createAgent()
    await signUp(owner, 'owner@test.dev')
    const id = randomUUID()
    await owner.post('/api/lessons').send(lessonPayload(id))

    const intruder = createAgent()
    await signUp(intruder, 'intruder@test.dev')
    const res = await intruder.patch(`/api/lessons/${id}`).send({ title: 'Взлом' })
    expect(res.status).toBe(404)
  })

  it('deletes a lesson and returns 404 for a foreign one', async () => {
    const owner = createAgent()
    await signUp(owner, 'del-owner@test.dev')
    const id = randomUUID()
    await owner.post('/api/lessons').send(lessonPayload(id))

    const intruder = createAgent()
    await signUp(intruder, 'del-intruder@test.dev')
    const foreign = await intruder.delete(`/api/lessons/${id}`)
    expect(foreign.status).toBe(404)

    const mine = await owner.delete(`/api/lessons/${id}`)
    expect(mine.status).toBe(204)
  })

  it('creates a task with dueDate and status', async () => {
    const agent = createAgent()
    await signUp(agent, 'task@test.dev')
    const res = await agent.post('/api/tasks').send({
      id: randomUUID(),
      title: 'Решить 5 задач',
      priority: 'medium',
      status: 'todo',
      dueDate: '2026-09-01',
      createdAt: new Date().toISOString(),
    })
    expect(res.status).toBe(201)
    expect(res.body.dueDate).toBe('2026-09-01')
  })
})
```

- [ ] **Step 3: Прогнать тесты (после Task 11)**

Run: `npm test` (в `backend/`)
Expected: CRUD-тесты зелёные, включая проверки изоляции (404 на чужие записи).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/entities.ts backend/test/entities.test.ts
git commit -m "Add generic entity CRUD router with isolation tests"
```

---

### Task 9: Роуты settings и game-records

**Files:**
- Create: `backend/src/routes/settings.ts`
- Create: `backend/src/routes/gameRecords.ts`
- Create: `backend/test/settings.test.ts`
- Create: `backend/test/gameRecords.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4 (`db`, таблицы `settings`/`gameRecords`, схемы).
- Produces:
  - `settingsRouter` — `PUT /api/settings` (upsert одной строки на пользователя), ответ — сохранённые настройки.
  - `gameRecordsRouter` — `PUT /api/game-records` с телом `{ game, difficulty, value }`, ответ `{ isRecord: boolean }` (snake — больше лучше, остальные — меньше лучше).

- [ ] **Step 1: Написать роуты**

`backend/src/routes/settings.ts`:

```ts
import { Router } from 'express'
import { db } from '../db/client'
import { settings as settingsTable } from '../db/schema'
import { settingsSchema } from '../lib/validation'

export const settingsRouter = Router()

settingsRouter.put('/', async (req, res, next) => {
  try {
    const parsed = settingsSchema.parse(req.body)
    const row = {
      theme: parsed.theme,
      pomodoroWorkMinutes: parsed.pomodoroWorkMinutes,
      pomodoroShortBreakMinutes: parsed.pomodoroShortBreakMinutes,
      pomodoroLongBreakMinutes: parsed.pomodoroLongBreakMinutes,
    }
    await db
      .insert(settingsTable)
      .values({ userId: req.userId, ...row })
      .onConflictDoUpdate({ target: settingsTable.userId, set: row })
    res.json(parsed)
  } catch (err) {
    next(err)
  }
})
```

`backend/src/routes/gameRecords.ts`:

```ts
import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { gameRecords as gameRecordsTable } from '../db/schema'
import { gameRecordSchema } from '../lib/validation'

export const gameRecordsRouter = Router()

gameRecordsRouter.put('/', async (req, res, next) => {
  try {
    const { game, difficulty, value } = gameRecordSchema.parse(req.body)
    const [existing] = await db
      .select()
      .from(gameRecordsTable)
      .where(
        and(
          eq(gameRecordsTable.userId, req.userId),
          eq(gameRecordsTable.game, game),
          eq(gameRecordsTable.difficulty, difficulty),
        ),
      )
    const isBetter = !existing || (game === 'snake' ? value > existing.bestValue : value < existing.bestValue)
    if (isBetter) {
      await db
        .insert(gameRecordsTable)
        .values({ userId: req.userId, game, difficulty, bestValue: value })
        .onConflictDoUpdate({
          target: [gameRecordsTable.userId, gameRecordsTable.game, gameRecordsTable.difficulty],
          set: { bestValue: value },
        })
    }
    res.json({ isRecord: isBetter })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 2: Написать тесты**

`backend/test/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('settings', () => {
  it('requires auth', async () => {
    const res = await request(app).put('/api/settings').send({})
    expect(res.status).toBe(401)
  })

  it('saves and overwrites settings per user', async () => {
    const agent = createAgent()
    await signUp(agent, 's1@test.dev')
    const first = await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 30, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(first.status).toBe(200)
    expect(first.body.theme).toBe('dark')

    const second = await agent.put('/api/settings').send({ theme: 'light', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(second.status).toBe(200)
    expect(second.body.theme).toBe('light')
  })

  it('rejects invalid settings with 400', async () => {
    const agent = createAgent()
    await signUp(agent, 's2@test.dev')
    const res = await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 0, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 })
    expect(res.status).toBe(400)
  })
})
```

`backend/test/gameRecords.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('game records', () => {
  it('stores the first record and reports isRecord: true', async () => {
    const agent = createAgent()
    await signUp(agent, 'g1@test.dev')
    const res = await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 12 })
    expect(res.status).toBe(200)
    expect(res.body.isRecord).toBe(true)
  })

  it('does not overwrite a better existing record (memory: fewer is better)', async () => {
    const agent = createAgent()
    await signUp(agent, 'g2@test.dev')
    await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 12 })
    const res = await agent.put('/api/game-records').send({ game: 'memory', difficulty: 'easy', value: 20 })
    expect(res.body.isRecord).toBe(false)
  })

  it('treats snake as higher-is-better', async () => {
    const agent = createAgent()
    await signUp(agent, 'g3@test.dev')
    await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 10 })
    const worse = await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 8 })
    expect(worse.body.isRecord).toBe(false)
    const better = await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'medium', value: 15 })
    expect(better.body.isRecord).toBe(true)
  })

  it('keeps records per user separate', async () => {
    const agentA = createAgent()
    await signUp(agentA, 'g4a@test.dev')
    await agentA.put('/api/game-records').send({ game: 'minesweeper', difficulty: 'easy', value: 30 })

    const agentB = createAgent()
    await signUp(agentB, 'g4b@test.dev')
    const res = await agentB.put('/api/game-records').send({ game: 'minesweeper', difficulty: 'easy', value: 60 })
    expect(res.body.isRecord).toBe(true) // B's own first record, not compared with A's
  })
})
```

- [ ] **Step 3: Прогнать тесты (после Task 11)**

Run: `npm test` (в `backend/`)
Expected: settings- и gameRecords-тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes backend/test
git commit -m "Add settings and game-records routes with tests"
```

---

### Task 10: Роут `/api/state` — полный снимок

**Files:**
- Create: `backend/src/routes/state.ts`
- Create: `backend/test/state.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4 (все таблицы, `DEFAULT_SETTINGS`).
- Produces: `stateRouter` — `GET /api/state` возвращает:
  `{ lessons, tasks, deadlines, notes, focusSessions, settings, gameRecords }`, где `gameRecords` собран в формат `Record<GameId, Partial<Record<GameDifficulty, number>>>` (пустые вложенные объекты), а `settings` — дефолтные, если строки нет.

- [ ] **Step 1: Написать роут**

`backend/src/routes/state.ts`:

```ts
import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { deadlines, focusSessions, gameRecords, lessons, notes, settings, tasks } from '../db/schema'
import { DEFAULT_SETTINGS } from '../lib/defaults'

type GameId = 'memory' | 'snake' | 'minesweeper'
type GameDifficulty = 'easy' | 'medium' | 'hard'

export const stateRouter = Router()

stateRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId
    const [lessonRows, taskRows, deadlineRows, noteRows, sessionRows, settingsRows, recordRows] = await Promise.all([
      db.select().from(lessons).where(eq(lessons.userId, userId)),
      db.select().from(tasks).where(eq(tasks.userId, userId)),
      db.select().from(deadlines).where(eq(deadlines.userId, userId)),
      db.select().from(notes).where(eq(notes.userId, userId)),
      db.select().from(focusSessions).where(eq(focusSessions.userId, userId)),
      db.select().from(settings).where(eq(settings.userId, userId)),
      db.select().from(gameRecords).where(eq(gameRecords.userId, userId)),
    ])

    const gameRecordsOut: Record<GameId, Partial<Record<GameDifficulty, number>>> = {
      memory: {},
      snake: {},
      minesweeper: {},
    }
    for (const r of recordRows) {
      gameRecordsOut[r.game as GameId][r.difficulty as GameDifficulty] = r.bestValue
    }

    const s = settingsRows[0]
    res.json({
      lessons: lessonRows,
      tasks: taskRows,
      deadlines: deadlineRows,
      notes: noteRows,
      focusSessions: sessionRows,
      settings: s
        ? {
            theme: s.theme,
            pomodoroWorkMinutes: s.pomodoroWorkMinutes,
            pomodoroShortBreakMinutes: s.pomodoroShortBreakMinutes,
            pomodoroLongBreakMinutes: s.pomodoroLongBreakMinutes,
          }
        : DEFAULT_SETTINGS,
      gameRecords: gameRecordsOut,
    })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 2: Написать тесты**

`backend/test/state.test.ts` — снимок + полная изоляция между двумя пользователями:

```ts
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { createAgent, signUp } from './helpers'

describe('state snapshot', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/state')
    expect(res.status).toBe(401)
  })

  it('returns empty collections and default settings for a new user', async () => {
    const agent = createAgent()
    await signUp(agent, 'fresh@test.dev')
    const res = await agent.get('/api/state')
    expect(res.status).toBe(200)
    expect(res.body.lessons).toEqual([])
    expect(res.body.tasks).toEqual([])
    expect(res.body.settings.theme).toBe('system')
    expect(res.body.gameRecords).toEqual({ memory: {}, snake: {}, minesweeper: {} })
  })

  it('returns everything the user created, including game records', async () => {
    const agent = createAgent()
    await signUp(agent, 'full@test.dev')
    await agent.post('/api/lessons').send({ id: randomUUID(), title: 'Физика', type: 'weekly', weekday: 2, startTime: '11:00', endTime: '12:30' })
    await agent.put('/api/settings').send({ theme: 'dark', pomodoroWorkMinutes: 40, pomodoroShortBreakMinutes: 7, pomodoroLongBreakMinutes: 20 })
    await agent.put('/api/game-records').send({ game: 'snake', difficulty: 'hard', value: 42 })

    const res = await agent.get('/api/state')
    expect(res.body.lessons).toHaveLength(1)
    expect(res.body.lessons[0].title).toBe('Физика')
    expect(res.body.settings.theme).toBe('dark')
    expect(res.body.gameRecords.snake.hard).toBe(42)
  })

  it('isolates data between two users', async () => {
    const agentA = createAgent()
    await signUp(agentA, 'iso-a@test.dev')
    await agentA.post('/api/tasks').send({ id: randomUUID(), title: 'Секрет A', priority: 'high', status: 'todo', createdAt: new Date().toISOString() })

    const agentB = createAgent()
    await signUp(agentB, 'iso-b@test.dev')
    const resB = await agentB.get('/api/state')
    expect(resB.body.tasks).toEqual([])
  })
})
```

- [ ] **Step 3: Прогнать тесты (после Task 11)**

Run: `npm test` (в `backend/`)
Expected: state-тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/state.ts backend/test/state.test.ts
git commit -m "Add state snapshot route with isolation tests"
```

---

### Task 11: Сборка приложения (app.ts + index.ts) и полный прогон

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Create: `backend/Dockerfile`

**Interfaces:**
- Consumes: все предыдущие роуты/миддлвары (auth, state, settings, gameRecords, entities).
- Produces:
  - `app` — готовое Express-приложение (экспорт для Supertest).
  - `index.ts` — точка входа: миграции → `listen(3000)`.
  - `backend/Dockerfile` — мультистейдж: build (`tsc`) → runtime (production deps + `dist` + `drizzle/`).

- [ ] **Step 1: Написать app.ts**

`backend/src/app.ts`:

```ts
import express from 'express'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'
import { stateRouter } from './routes/state'
import { settingsRouter } from './routes/settings'
import { gameRecordsRouter } from './routes/gameRecords'
import { createEntityRouter } from './routes/entities'
import { deadlines, focusSessions, lessons, notes, tasks } from './db/schema'
import { deadlineSchema, focusSessionSchema, lessonSchema, noteSchema, taskSchema } from './lib/validation'
import { requireAuth } from './middleware/auth'
import { errorHandler } from './middleware/error'

export const app = express()

app.disable('x-powered-by')
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/state', requireAuth, stateRouter)
app.use('/api/lessons', requireAuth, createEntityRouter(lessons, lessonSchema))
app.use('/api/tasks', requireAuth, createEntityRouter(tasks, taskSchema))
app.use('/api/deadlines', requireAuth, createEntityRouter(deadlines, deadlineSchema))
app.use('/api/notes', requireAuth, createEntityRouter(notes, noteSchema))
app.use('/api/focus-sessions', requireAuth, createEntityRouter(focusSessions, focusSessionSchema))
app.use('/api/settings', requireAuth, settingsRouter)
app.use('/api/game-records', requireAuth, gameRecordsRouter)
app.use(errorHandler)
```

- [ ] **Step 2: Написать index.ts**

`backend/src/index.ts`:

```ts
import { app } from './app'
import { runMigrations } from './db/migrate'

const PORT = Number(process.env.PORT ?? 3000)

async function main(): Promise<void> {
  await runMigrations()
  app.listen(PORT, () => {
    console.log(`Backend listening on :${PORT}`)
  })
}

main().catch((err) => {
  console.error('Backend failed to start', err)
  process.exit(1)
})
```

- [ ] **Step 3: Написать Dockerfile**

`backend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 4: Прогнать все тесты**

Run: `npm test` (в `backend/`)
Expected: все тесты зелёные (auth, entities, settings, gameRecords, state — вместе ~30 тестов). Если `globalSetup` падает — проверить, что контейнер `sd-postgres` запущен (Task 1, Step 3).

- [ ] **Step 5: Проверить production-сборку**

Run: `npm run build` (в `backend/`)
Expected: собран `backend/dist/`, ошибок нет. Если Task 8 (entities.ts) давал ошибки типов — исправить там и пересобрать.

- [ ] **Step 6: Commit**

```bash
git add backend/src/app.ts backend/src/index.ts backend/Dockerfile
git commit -m "Wire Express app, server entry and backend Dockerfile"
```

---

### Task 12: Docker Compose, nginx, .env.example

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `nginx.conf`

**Interfaces:**
- Consumes: Task 11 (backend image), существующий `Dockerfile` фронтенда и `nginx.conf`.
- Produces: инфраструктура деплоя — три сервиса; nginx проксирует `/api/` на `backend:3000`.

- [ ] **Step 1: Написать docker-compose.yml**

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-study}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_DB: ${POSTGRES_DB:-study_dashboard}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-study} -d ${POSTGRES_DB:-study_dashboard}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-study}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-study_dashboard}
      JWT_SECRET: ${JWT_SECRET:?set JWT_SECRET in .env}
      NODE_ENV: production
      PORT: 3000
    expose:
      - "3000"

  frontend:
    build: .
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

- [ ] **Step 2: Обновить nginx.conf**

Добавить блок проксирования `/api/` перед `location /`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Proxy API calls to the backend container
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback: let React Router handle client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed assets aggressively, never cache index.html
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

- [ ] **Step 3: Создать .env.example**

`.env.example`:

```
POSTGRES_USER=study
POSTGRES_PASSWORD=change-me
POSTGRES_DB=study_dashboard
JWT_SECRET=change-me-to-a-long-random-string
```

- [ ] **Step 4: Обновить README**

В `README.md` дополнить разделы:

```markdown
## Запуск (Docker Compose, продакшен)

```bash
cp .env.example .env   # затем впиши свои POSTGRES_PASSWORD и JWT_SECRET
docker compose up -d --build
```

Сайт доступен на порту 80; миграции БД применяются автоматически при старте backend.

## Бэкенд (разработка)

```bash
cd backend
npm install
npm run dev        # tsx watch, порт 3000
npm test           # требует PostgreSQL на localhost:5432 (см. план, Task 1)
npm run build
```
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example nginx.conf README.md
git commit -m "Add docker-compose, nginx API proxy and env template"
```

---

## Часть B. Фронтенд

### Task 13: API-клиент, кэш, тосты

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/cache.ts`
- Create: `src/lib/toast.ts`
- Test: `src/lib/api.test.ts`
- Test: `src/lib/cache.test.ts`

**Interfaces:**
- Consumes: `src/lib/storage.ts` (`loadFromStorage`, `saveToStorage` — остаются как есть).
- Produces:
  - `class ApiError extends Error { status: number; code: string }`.
  - `api.get/post/patch/put/delete<T>(path, body?)` — базовый путь `/api`, `credentials: 'same-origin'`, dispatch события `auth:unauthorized` при `401`, бросок `ApiError` с русским сообщением.
  - `cacheState(state)` / `loadCachedState()` — офлайн-кэш последнего снимка под ключом `study-dashboard:cache`.
  - `useToast` (zustand-стор: `message`, `show`, `hide`) и `notifyError(err)`.
  - Тип `ServerState` импортируется из `../store/useStore` (появится в Task 17; в тестах Task 13 подставлять объект с ключами `lessons/tasks/deadlines/notes/focusSessions/settings/gameRecords`).

- [ ] **Step 1: Написать api.ts**

`src/lib/api.ts`:

```ts
export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
  if (!res.ok) {
    let message = 'Что-то пошло не так'
    let code = 'ERROR'
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } }
      message = body.error?.message ?? message
      code = body.error?.code ?? code
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, code)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = undefined>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Написать cache.ts и toast.ts**

`src/lib/cache.ts`:

```ts
import { loadFromStorage, saveToStorage } from './storage'
import type { ServerState } from '../store/useStore'

const CACHE_KEY = 'study-dashboard:cache'

export function cacheState(state: ServerState): void {
  saveToStorage(CACHE_KEY, state)
}

export function loadCachedState(): ServerState | null {
  return loadFromStorage<ServerState | null>(CACHE_KEY, null)
}
```

`src/lib/toast.ts`:

```ts
import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string) => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}))

export function notifyError(err: unknown): void {
  useToast.getState().show(err instanceof Error ? err.message : 'Что-то пошло не так')
}
```

- [ ] **Step 3: Написать тесты**

`src/lib/api.test.ts` — мокаем глобальный `fetch`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('GETs JSON from /api prefixed path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ hello: 'world' }) }))
    const result = await api.get<{ hello: string }>('/state')
    expect(result).toEqual({ hello: 'world' })
    expect(fetch).toHaveBeenCalledWith('/api/state', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('throws ApiError with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Время конца должно быть позже времени начала' } }),
      }),
    )
    await expect(api.post('/lessons', {})).rejects.toMatchObject({ status: 400, message: 'Время конца должно быть позже времени начала' })
  })

  it('throws ApiError with a generic message when body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('parse') } }))
    await expect(api.get('/state')).rejects.toBeInstanceOf(ApiError)
  })

  it('dispatches auth:unauthorized on 401', async () => {
    const dispatched = vi.fn()
    window.addEventListener('auth:unauthorized', dispatched)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Требуется вход' } }) }))
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(dispatched).toHaveBeenCalledTimes(1)
  })

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    const result = await api.delete('/lessons/abc')
    expect(result).toBeUndefined()
  })
})
```

`src/lib/cache.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cacheState, loadCachedState } from './cache'

const sample = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'dark', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: { memory: {}, snake: {}, minesweeper: {} },
}

describe('offline cache', () => {
  it('round-trips a state snapshot', () => {
    cacheState(sample)
    expect(loadCachedState()).toEqual(sample)
  })

  it('returns null when nothing is cached', () => {
    localStorage.clear()
    expect(loadCachedState()).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('study-dashboard:cache', '{corrupt')
    expect(loadCachedState()).toBeNull()
  })
})
```

- [ ] **Step 4: Запустить тесты фронтенда**

Run: `npm test` (в корне)
Expected: api/cache-тесты зелёные (store-тесты пока падают — их переписываем в Task 17; для чистого прогона конкретных файлов: `npx vitest run src/lib/api.test.ts src/lib/cache.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/cache.ts src/lib/toast.ts src/lib/api.test.ts src/lib/cache.test.ts
git commit -m "Add API client, offline cache and toast store"
```

---

### Task 14: Auth-стор (`useAuth`)

**Files:**
- Create: `src/store/useAuth.ts`
- Test: `src/store/useAuth.test.ts`

**Interfaces:**
- Consumes: Task 13 (`api`, `cacheState`/`loadCachedState`), Task 17 (`useStore` — рантайм-импорт `useStore` из `./useStore`; в тестах мокается).
- Produces:
  - `type AuthStatus = 'loading' | 'guest' | 'authed' | 'offline'`.
  - `useAuth` — zustand-стор: `{ user, status, check, login, register, logout }`.
  - `check()` — `GET /auth/me` → при успехе `GET /state` → `hydrate` + `cacheState`; при `401` → `guest`; при сетевой ошибке → `offline` с кэшем или `guest`.
  - `login(email, password)` — вход + загрузка состояния.
  - `register(email, password)` — регистрация (состояние пустое).
  - `logout()` — выход + `resetLocal`.

- [ ] **Step 1: Написать стор**

`src/store/useAuth.ts`:

```ts
import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import { cacheState, loadCachedState } from '../lib/cache'
import { useStore, type ServerState } from './useStore'

export type AuthStatus = 'loading' | 'guest' | 'authed' | 'offline'

interface AuthState {
  user: { id: string; email: string } | null
  status: AuthStatus
  check: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  check: async () => {
    if (get().status !== 'loading') return
    try {
      const user = await api.get<{ id: string; email: string }>('/auth/me')
      const state = await api.get<ServerState>('/state')
      useStore.getState().hydrate(state)
      cacheState(state)
      set({ user, status: 'authed' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        set({ user: null, status: 'guest' })
        return
      }
      const cached = loadCachedState()
      if (cached) {
        useStore.getState().hydrate(cached)
        set({ user: null, status: 'offline' })
      } else {
        set({ user: null, status: 'guest' })
      }
    }
  },

  login: async (email, password) => {
    const user = await api.post<{ id: string; email: string }>('/auth/login', { email, password })
    const state = await api.get<ServerState>('/state')
    useStore.getState().hydrate(state)
    cacheState(state)
    set({ user, status: 'authed' })
  },

  register: async (email, password) => {
    const user = await api.post<{ id: string; email: string }>('/auth/register', { email, password })
    set({ user, status: 'authed' })
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {})
    useStore.getState().resetLocal()
    set({ user: null, status: 'guest' })
  },
}))
```

- [ ] **Step 2: Написать тесты**

`src/store/useAuth.test.ts` — мокаем `api`, `cache` и `useStore`:

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { api, ApiError } from '../lib/api'
import { useAuth } from './useAuth'

const { hydrateMock, resetLocalMock, loadCachedMock, cacheStateMock } = vi.hoisted(() => ({
  hydrateMock: vi.fn(),
  resetLocalMock: vi.fn(),
  loadCachedMock: vi.fn(() => null),
  cacheStateMock: vi.fn(),
}))

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }
})
vi.mock('../lib/cache', () => ({
  cacheState: (...args: unknown[]) => cacheStateMock(...args),
  loadCachedState: () => loadCachedMock(),
}))
vi.mock('./useStore', () => ({ useStore: { getState: () => ({ hydrate: hydrateMock, resetLocal: resetLocalMock }) } }))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.setState({ user: null, status: 'loading' })
})

describe('useAuth', () => {
  it('check() authenticates and loads state', async () => {
    mockedGet.mockResolvedValueOnce({ id: 'u1', email: 'a@b.dev' }).mockResolvedValueOnce({ lessons: [] })
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('authed')
    expect(hydrateMock).toHaveBeenCalled()
    expect(cacheStateMock).toHaveBeenCalled()
  })

  it('check() goes to guest on 401', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError('Требуется вход', 401))
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('guest')
  })

  it('check() goes offline with cached data on network error', async () => {
    mockedGet.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    loadCachedMock.mockReturnValueOnce({ lessons: [] })
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('offline')
    expect(hydrateMock).toHaveBeenCalled()
  })

  it('check() goes to guest on network error without cache', async () => {
    mockedGet.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('guest')
  })

  it('login() authenticates and loads state', async () => {
    mockedPost.mockResolvedValueOnce({ id: 'u1', email: 'a@b.dev' })
    mockedGet.mockResolvedValueOnce({ lessons: [] })
    await useAuth.getState().login('a@b.dev', 'password123')
    expect(useAuth.getState().status).toBe('authed')
    expect(mockedPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.dev', password: 'password123' })
  })

  it('login() propagates ApiError message', async () => {
    mockedPost.mockRejectedValueOnce(new ApiError('Неверный email или пароль', 401))
    await expect(useAuth.getState().login('a@b.dev', 'wrong')).rejects.toThrow('Неверный email или пароль')
  })

  it('logout() resets local state and returns to guest', async () => {
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(useAuth.getState().status).toBe('guest')
    expect(resetLocalMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Запустить тесты**

Run: `npx vitest run src/store/useAuth.test.ts` (в корне)
Expected: useAuth-тесты зелёные (store-тесты `useStore.test.ts` всё ещё падают до Task 17 — это ожидаемо).

- [ ] **Step 4: Commit**

```bash
git add src/store/useAuth.ts src/store/useAuth.test.ts
git commit -m "Add auth store with session check and offline fallback"
```

---

### Task 15: Страницы входа и регистрации

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/RegisterPage.tsx`
- Test: `src/pages/LoginPage.test.tsx`
- Test: `src/pages/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`useAuth`), UI-компоненты `Card`, `Input`, `Button` (пропсы: `Input { label, type, value, onChange }`, `Button { variant, type, disabled }`, `Card { title }`).
- Produces: два маршрута `/login` и `/register` (подключаются в Task 16); после успеха — `navigate('/', { replace: true })`.

- [ ] **Step 1: Написать LoginPage**

`src/pages/LoginPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Card title="Вход в Study Dashboard">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Пароль" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Входим…' : 'Войти'}
          </Button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Написать RegisterPage**

`src/pages/RegisterPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function RegisterPage() {
  const { register, status } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to="/" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Card title="Регистрация">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Пароль" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input label="Повторите пароль" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Регистрируем…' : 'Зарегистрироваться'}
          </Button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Войти
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Написать тесты**

`src/pages/LoginPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))
vi.mock('../store/useAuth', () => ({
  useAuth: () => ({ login: loginMock, status: 'guest' }),
}))

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  it('submits credentials and redirects to the dashboard', async () => {
    loginMock.mockResolvedValue(undefined)
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(loginMock).toHaveBeenCalledWith('a@b.dev', 'password123')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an inline error when login fails', async () => {
    loginMock.mockRejectedValue(new Error('Неверный email или пароль'))
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный email или пароль')).toBeInTheDocument()
  })
})
```

`src/pages/RegisterPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }))
vi.mock('../store/useAuth', () => ({
  useAuth: () => ({ register: registerMock, status: 'guest' }),
}))

describe('RegisterPage', () => {
  it('registers and redirects to the dashboard', async () => {
    registerMock.mockResolvedValue(undefined)
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.type(screen.getByLabelText('Повторите пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(registerMock).toHaveBeenCalledWith('a@b.dev', 'password123')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an error when passwords do not match', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.type(screen.getByLabelText('Повторите пароль'), 'password124')
    await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx` (в корне)
Expected: тесты страниц зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/RegisterPage.tsx src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx
git commit -m "Add login and registration pages"
```

---

### Task 16: ProtectedRoute, роутинг и bootstrap

**Files:**
- Create: `src/components/layout/ProtectedRoute.tsx`
- Create: `src/components/layout/OfflineBanner.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 14 (`useAuth`), Task 15 (страницы), Task 13 (`useToast`).
- Produces: защищённые маршруты; `main.tsx` вызывает `useAuth.getState().check()` при старте; тест App обновляется с моком `useAuth`.

- [ ] **Step 1: Написать ProtectedRoute**

`src/components/layout/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'

export default function ProtectedRoute() {
  const status = useAuth((s) => s.status)
  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">Загрузка…</div>
  }
  if (status === 'guest') return <Navigate to="/login" replace />
  return <Outlet />
}
```

- [ ] **Step 2: Написать OfflineBanner**

`src/components/layout/OfflineBanner.tsx`:

```tsx
import { useAuth } from '../../store/useAuth'

export default function OfflineBanner() {
  const status = useAuth((s) => s.status)
  if (status !== 'offline') return null
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
      Нет соединения — показаны сохранённые данные
    </div>
  )
}
```

- [ ] **Step 3: Перестроить App.tsx**

`src/App.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import TasksPage from './pages/TasksPage'
import DeadlinesPage from './pages/DeadlinesPage'
import NotesPage from './pages/NotesPage'
import FocusPage from './pages/FocusPage'
import SettingsPage from './pages/SettingsPage'
import GamesPage from './pages/GamesPage'
import MemoryPage from './pages/MemoryPage'
import SnakePage from './pages/SnakePage'
import MinesweeperPage from './pages/MinesweeperPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="deadlines" element={<DeadlinesPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/memory" element={<MemoryPage />} />
          <Route path="games/snake" element={<SnakePage />} />
          <Route path="games/minesweeper" element={<MinesweeperPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 4: Обновить main.tsx**

`src/main.tsx` — запустить проверку сессии до рендера:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { useAuth } from './store/useAuth'
import './index.css'

void useAuth.getState().check()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 5: Обновить App.test.tsx**

`src/App.test.tsx` — мок `useAuth` как авторизованного:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

vi.mock('./store/useAuth', () => ({
  useAuth: (selector: (s: { status: string }) => unknown) => selector({ user: { id: 'u1', email: 'a@b.dev' }, status: 'authed' }),
}))

test('renders nav labels for an authenticated user', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getAllByText('Study Dashboard').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Главная').length).toBeGreaterThan(0)
})
```

- [ ] **Step 6: Запустить тесты**

Run: `npx vitest run src/App.test.tsx` (в корне)
Expected: App.test зелёный (store-тесты ещё падают — Task 17).

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/ProtectedRoute.tsx src/components/layout/OfflineBanner.tsx src/App.tsx src/main.tsx src/App.test.tsx
git commit -m "Add protected routes, session bootstrap and offline banner"
```

---

### Task 17: Переделка стора — серверная синхронизация

**Files:**
- Modify: `src/store/useStore.ts` (полностью)
- Delete: `src/lib/demoData.ts`
- Rewrite: `src/store/useStore.test.ts`
- Modify: `src/components/layout/AppLayout.tsx` (тост + офлайн-баннер)
- Modify: `src/pages/SettingsPage.tsx` (убрать «Сбросить демо-данные»/«Очистить все данные»)

**Interfaces:**
- Consumes: Task 13 (`api`, `notifyError`), `src/lib/id.ts` (`uid()`), типы из `src/types/index.ts`, `src/lib/games/types.ts`.
- Produces (новый контракт стора):
  - `export type ServerState = Pick<StoreState, 'lessons' | 'tasks' | 'deadlines' | 'notes' | 'focusSessions' | 'settings' | 'gameRecords'>`
  - Экшены: `addLesson/addTask/addDeadline/addNote/addFocusSession` (получают input как раньше, **сами** генерируют `id`/`createdAt`), `update*`, `remove*`, `toggleTask`, `togglePinNote`, `updateSettings`, `submitGameRecord` (теперь **async**, возвращает `Promise<boolean>`), `hydrate(state: ServerState)`, `resetLocal()`.
  - Удаляются: `resetAll`, `clearAll`, `seedState`, migrate-логика, `PersistStorage`.
  - Все мутации — оптимистичные: локальный стор меняется сразу, затем запрос; при ошибке — откат и `notifyError`.

- [ ] **Step 1: Переписать useStore.ts**

`src/store/useStore.ts` (полный новый файл):

```ts
import { create } from 'zustand'
import type { Deadline, FocusSession, Lesson, Note, Settings, Task } from '../types'
import type { GameId, GameDifficulty, GameRecord } from '../lib/games/types'
import { EMPTY_GAME_RECORDS } from '../lib/games/types'
import { api } from '../lib/api'
import { notifyError } from '../lib/toast'
import { uid } from '../lib/id'

export type TaskInput = Omit<Task, 'id' | 'createdAt'>
export type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>

export interface StoreState {
  lessons: Lesson[]
  tasks: Task[]
  deadlines: Deadline[]
  notes: Note[]
  focusSessions: FocusSession[]
  settings: Settings
  gameRecords: GameRecord
  addLesson: (input: Omit<Lesson, 'id'>) => void
  updateLesson: (id: string, patch: Partial<Lesson>) => void
  removeLesson: (id: string) => void
  addTask: (input: TaskInput) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  addDeadline: (input: Omit<Deadline, 'id' | 'createdAt'>) => void
  updateDeadline: (id: string, patch: Partial<Deadline>) => void
  removeDeadline: (id: string) => void
  addNote: (input: NoteInput) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  togglePinNote: (id: string) => void
  addFocusSession: (input: Omit<FocusSession, 'id' | 'startedAt'>) => void
  updateSettings: (patch: Partial<Settings>) => void
  submitGameRecord: (game: GameId, difficulty: GameDifficulty, value: number) => Promise<boolean>
  hydrate: (state: ServerState) => void
  resetLocal: () => void
}

export type ServerState = Pick<StoreState, 'lessons' | 'tasks' | 'deadlines' | 'notes' | 'focusSessions' | 'settings' | 'gameRecords'>

const EMPTY_STATE: ServerState = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: EMPTY_GAME_RECORDS,
}

function rollback<T extends { id: string }>(items: T[], id: string, prev: T): T[] {
  return items.map((item) => (item.id === id ? { ...prev } : item))
}

export const useStore = create<StoreState>((set, get) => ({
  ...EMPTY_STATE,

  addLesson: (input) => {
    const lesson = { ...input, id: uid() }
    set((s) => ({ lessons: [...s.lessons, lesson] }))
    void api.post<Lesson>('/lessons', lesson).catch((err) => {
      set((s) => ({ lessons: s.lessons.filter((l) => l.id !== lesson.id) }))
      notifyError(err)
    })
  },
  updateLesson: (id, patch) => {
    const prev = get().lessons.find((l) => l.id === id)
    set((s) => ({ lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
    if (prev) {
      void api.patch<Lesson>(`/lessons/${id}`, patch).catch((err) => {
        set((s) => ({ lessons: rollback(s.lessons, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeLesson: (id) => {
    const prev = get().lessons
    set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) }))
    void api.delete(`/lessons/${id}`).catch((err) => {
      set({ lessons: prev })
      notifyError(err)
    })
  },

  addTask: (input) => {
    const task: Task = { ...input, id: uid(), createdAt: new Date().toISOString() }
    set((s) => ({ tasks: [...s.tasks, task] }))
    void api.post<Task>('/tasks', task).catch((err) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) }))
      notifyError(err)
    })
  },
  updateTask: (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    if (prev) {
      void api.patch<Task>(`/tasks/${id}`, patch).catch((err) => {
        set((s) => ({ tasks: rollback(s.tasks, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeTask: (id) => {
    const prev = get().tasks
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    void api.delete(`/tasks/${id}`).catch((err) => {
      set({ tasks: prev })
      notifyError(err)
    })
  },
  toggleTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const patch = task.status === 'done'
      ? { status: 'todo' as const, completedAt: undefined }
      : { status: 'done' as const, completedAt: new Date().toISOString() }
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    void api.patch<Task>(`/tasks/${id}`, patch).catch((err) => {
      set((s) => ({ tasks: rollback(s.tasks, id, task) }))
      notifyError(err)
    })
  },

  addDeadline: (input) => {
    const deadline: Deadline = { ...input, id: uid(), createdAt: new Date().toISOString() }
    set((s) => ({ deadlines: [...s.deadlines, deadline] }))
    void api.post<Deadline>('/deadlines', deadline).catch((err) => {
      set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== deadline.id) }))
      notifyError(err)
    })
  },
  updateDeadline: (id, patch) => {
    const prev = get().deadlines.find((d) => d.id === id)
    set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
    if (prev) {
      void api.patch<Deadline>(`/deadlines/${id}`, patch).catch((err) => {
        set((s) => ({ deadlines: rollback(s.deadlines, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeDeadline: (id) => {
    const prev = get().deadlines
    set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) }))
    void api.delete(`/deadlines/${id}`).catch((err) => {
      set({ deadlines: prev })
      notifyError(err)
    })
  },

  addNote: (input) => {
    const now = new Date().toISOString()
    const note: Note = { ...input, id: uid(), createdAt: now, updatedAt: now }
    set((s) => ({ notes: [...s.notes, note] }))
    void api.post<Note>('/notes', note).catch((err) => {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== note.id) }))
      notifyError(err)
    })
  },
  updateNote: (id, patch) => {
    const prev = get().notes.find((n) => n.id === id)
    const nextPatch = { ...patch, updatedAt: new Date().toISOString() }
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...nextPatch } : n)) }))
    if (prev) {
      void api.patch<Note>(`/notes/${id}`, nextPatch).catch((err) => {
        set((s) => ({ notes: rollback(s.notes, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeNote: (id) => {
    const prev = get().notes
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
    void api.delete(`/notes/${id}`).catch((err) => {
      set({ notes: prev })
      notifyError(err)
    })
  },
  togglePinNote: (id) => {
    const prev = get().notes.find((n) => n.id === id)
    if (!prev) return
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) }))
    const pinned = !prev.pinned
    void api.patch<Note>(`/notes/${id}`, { pinned }).catch((err) => {
      set((s) => ({ notes: rollback(s.notes, id, prev) }))
      notifyError(err)
    })
  },

  addFocusSession: (input) => {
    const session: FocusSession = { ...input, id: uid(), startedAt: new Date().toISOString() }
    set((s) => ({ focusSessions: [...s.focusSessions, session] }))
    void api.post<FocusSession>('/focus-sessions', session).catch((err) => {
      set((s) => ({ focusSessions: s.focusSessions.filter((f) => f.id !== session.id) }))
      notifyError(err)
    })
  },

  updateSettings: (patch) => {
    const prev = get().settings
    const next = { ...prev, ...patch }
    set({ settings: next })
    void api.put<Settings>('/settings', next).catch((err) => {
      set({ settings: prev })
      notifyError(err)
    })
  },

  submitGameRecord: async (game, difficulty, value) => {
    try {
      const { isRecord } = await api.put<{ isRecord: boolean }>('/game-records', { game, difficulty, value })
      if (isRecord) {
        set((s) => ({
          gameRecords: { ...s.gameRecords, [game]: { ...s.gameRecords[game], [difficulty]: value } },
        }))
      }
      return isRecord
    } catch (err) {
      notifyError(err)
      return false
    }
  },

  hydrate: (state) => set({ ...state }),
  resetLocal: () => set({ ...EMPTY_STATE }),
}))
```

- [ ] **Step 2: Удалить demoData.ts**

Run: `git rm src/lib/demoData.ts`
Expected: файл удалён; в репозитории не осталось импортов `getDemoData` (единственный был в старом `useStore.ts`, который переписан).

- [ ] **Step 3: Обновить AppLayout (тост + баннер)**

`src/components/layout/AppLayout.tsx` — полный новый файл:

```tsx
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'
import OfflineBanner from './OfflineBanner'
import { useToast } from '../../lib/toast'

export default function AppLayout() {
  const toastMessage = useToast((s) => s.message)
  const hideToast = useToast((s) => s.hide)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(hideToast, 4000)
    return () => clearTimeout(timer)
  }, [toastMessage, hideToast])

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <OfflineBanner />
      <Sidebar />
      <div className="pb-20 lg:pl-64 lg:pb-8">
        <header className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Study Dashboard</span>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      {toastMessage && (
        <div
          role="alert"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Убрать кнопки демо/очистки из SettingsPage**

В `src/pages/SettingsPage.tsx` удалить блок `<Card title="Данные">...</Card>` целиком (кнопки «Сбросить демо-данные» и «Очистить все данные»), а также строки `const resetAll = useStore((s) => s.resetAll)` и `const clearAll = useStore((s) => s.clearAll)`. Компонент остаётся с карточками «Внешний вид» и «Таймер фокусировки».

- [ ] **Step 5: Переписать store-тесты**

`src/store/useStore.test.ts` (полный новый файл):

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'
import type { Task } from '../types'

const { postMock, patchMock, deleteMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: postMock, patch: patchMock, put: putMock, delete: deleteMock },
}))
vi.mock('../lib/toast', () => ({ notifyError: vi.fn(), useToast: { getState: () => ({ show: vi.fn() }) } }))

beforeEach(() => {
  vi.clearAllMocks()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: { memory: {}, snake: {}, minesweeper: {} },
  })
})

describe('useStore', () => {
  it('adds a task optimistically and posts it to the server', () => {
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Решить 5 задач', priority: 'medium', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].title).toBe('Решить 5 задач')
    expect(postMock).toHaveBeenCalledWith('/tasks', expect.objectContaining({ title: 'Решить 5 задач' }))
  })

  it('rolls back an optimistic add when the server rejects', async () => {
    postMock.mockRejectedValue(new Error('Что-то пошло не так'))
    useStore.getState().addTask({ title: 'X', priority: 'low', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    await vi.waitFor(() => expect(useStore.getState().tasks).toHaveLength(0))
  })

  it('toggles a task status and patches the server', () => {
    patchMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Прочитать параграф', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    useStore.getState().toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('done')
    expect(useStore.getState().tasks[0].completedAt).toBeTruthy()
    expect(patchMock).toHaveBeenCalledWith(`/tasks/${id}`, expect.objectContaining({ status: 'done' }))
  })

  it('rolls back an optimistic patch on failure', async () => {
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'A', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    patchMock.mockRejectedValue(new Error('fail'))
    useStore.getState().updateTask(id, { title: 'B' })
    expect(useStore.getState().tasks[0].title).toBe('B')
    await vi.waitFor(() => expect(useStore.getState().tasks[0].title).toBe('A'))
  })

  it('removes a task and calls the server', () => {
    deleteMock.mockResolvedValue(undefined)
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Удалить', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    useStore.getState().removeTask(id)
    expect(useStore.getState().tasks).toHaveLength(0)
    expect(deleteMock).toHaveBeenCalledWith(`/tasks/${id}`)
  })

  it('hydrate() replaces all collections', () => {
    useStore.getState().hydrate({
      lessons: [],
      tasks: [{ id: 't1', title: 'Из сервера', priority: 'high', status: 'todo', createdAt: '2026-08-01T00:00:00.000Z' }],
      deadlines: [],
      notes: [],
      focusSessions: [],
      settings: { theme: 'dark', pomodoroWorkMinutes: 50, pomodoroShortBreakMinutes: 10, pomodoroLongBreakMinutes: 20 },
      gameRecords: { memory: {}, snake: { easy: 5 }, minesweeper: {} },
    })
    expect(useStore.getState().tasks[0].title).toBe('Из сервера')
    expect(useStore.getState().settings.theme).toBe('dark')
  })

  it('submitGameRecord is server-authoritative', async () => {
    putMock.mockResolvedValue({ isRecord: true })
    const isRecord = await useStore.getState().submitGameRecord('memory', 'easy', 12)
    expect(isRecord).toBe(true)
    expect(useStore.getState().gameRecords.memory.easy).toBe(12)
  })

  it('submitGameRecord does not update the store when the server says no', async () => {
    putMock.mockResolvedValue({ isRecord: false })
    const isRecord = await useStore.getState().submitGameRecord('snake', 'medium', 10)
    expect(isRecord).toBe(false)
    expect(useStore.getState().gameRecords.snake.medium).toBeUndefined()
  })

  it('resetLocal() clears all collections', () => {
    useStore.getState().addTask({ title: 'X', priority: 'low', status: 'todo' })
    useStore.getState().resetLocal()
    expect(useStore.getState().tasks).toHaveLength(0)
  })
})
```

- [ ] **Step 6: Запустить все тесты фронтенда**

Run: `npm test` (в корне)
Expected: все фронтенд-тесты зелёные. Если какой-то тест страницы обращался к `resetAll`/`clearAll`/демо-данным — удалить такую проверку (единственное место — SettingsPage, кнопки удалены в Step 4).

- [ ] **Step 7: Проверить сборку**

Run: `npm run build` (в корне)
Expected: собран `dist/`, ошибок нет.

- [ ] **Step 8: Commit**

```bash
git add src/store src/lib src/components/layout/AppLayout.tsx src/pages/SettingsPage.tsx src/App.test.tsx
git commit -m "Sync store with backend via optimistic updates"
```

> Удаление `demoData.ts` уже выполнено `git rm` в Step 2 — `git add` выше подхватит его как deletion.

---

### Task 18: Игровые страницы — асинхронные рекорды

**Files:**
- Modify: `src/pages/SnakePage.tsx`
- Modify: `src/pages/MemoryPage.tsx`
- Modify: `src/pages/MinesweeperPage.tsx`

**Interfaces:**
- Consumes: Task 17 (`submitGameRecord` теперь возвращает `Promise<boolean>`).
- Produces: результат игры показывается после ответа сервера (`isRecord` от сервера).

- [ ] **Step 1: Обновить SnakePage**

В `src/pages/SnakePage.tsx` заменить блок эффекта (сейчас там `const isRecord = submitGameRecord('snake', difficulty, game.score); setResult(...)`):

```tsx
useEffect(() => {
  if (!game.gameOver || resultHandledRef.current) return
  resultHandledRef.current = true
  void submitGameRecord('snake', difficulty, game.score).then((isRecord) => {
    setResult({ score: game.score, seconds, isRecord })
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [game.gameOver, result])
```

- [ ] **Step 2: Обновить MemoryPage**

В `src/pages/MemoryPage.tsx` заменить вызов в `handleCardClick` (сейчас `const isRecord = submitGameRecord('memory', difficulty, next.moves); setResult(...)`):

```tsx
if (memoryWin(next)) {
  void submitGameRecord('memory', difficulty, next.moves).then((isRecord) => {
    setResult({ moves: next.moves, seconds, isRecord })
  })
}
```

- [ ] **Step 3: Обновить MinesweeperPage**

В `src/pages/MinesweeperPage.tsx` заменить вызовы (сейчас `const isRecord = submitGameRecord('minesweeper', difficulty, seconds); setResult(...)`):

```tsx
if (game.won) {
  void submitGameRecord('minesweeper', difficulty, seconds).then((isRecord) => {
    setResult({ seconds, isRecord, won: true })
  })
} else {
  setResult({ seconds, isRecord: false, won: false })
}
```

- [ ] **Step 4: Запустить тесты игр**

Run: `npx vitest run src/pages/MemoryPage.test.tsx src/pages/SnakePage.test.tsx src/pages/MinesweeperPage.test.tsx` (в корне)
Expected: зелёные. Если тесты мокали `submitGameRecord` синхронно (`mockReturnValue`) — заменить на `mockResolvedValue`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SnakePage.tsx src/pages/MemoryPage.tsx src/pages/MinesweeperPage.tsx
git commit -m "Make game records server-authoritative"
```

---

### Task 19: Финальная валидация

**Files:** без изменений кода (только проверки).

- [ ] **Step 1: Прогнать тесты бэкенда**

Run: `cd backend && npm test`
Expected: все backend-тесты зелёные.

- [ ] **Step 2: Прогнать тесты фронтенда**

Run: `npm test` (в корне)
Expected: все фронтенд-тесты зелёные.

- [ ] **Step 3: Собрать оба проекта**

Run: `cd backend && npm run build` и `npm run build` (в корне)
Expected: оба `dist/` собраны без ошибок.

- [ ] **Step 4: Проверить конфигурацию Docker**

Run: `docker compose config`
Expected: конфигурация валидна, три сервиса (postgres, backend, frontend), секреты подхватываются из `.env` (создать из `.env.example`, если не создан).

- [ ] **Step 5: Смоук-тест приложения в Docker**

Run: `docker compose up -d --build`
Expected: контейнеры поднимаются, миграции применяются, `http://localhost/api/auth/me` отвечает `401`, регистрация через `curl -X POST http://localhost/api/auth/register -H "Content-Type: application/json" -d '{"email":"smoke@test.dev","password":"password123"}'` отвечает `201`.

- [ ] **Step 6: Commit (если были правки)**

```bash
git add -A
git commit -m "Final validation fixes"
```

---

## Self-Review

**Spec coverage:**
- БД + миграции: Tasks 2–3. Авторизация (регистрация/вход/выход/me): Tasks 5–7. Изоляция данных: Task 8, 10 (тесты). CRUD: Tasks 8–10. Рекорды игр: Task 9, 18. Settings: Task 9, 17. Развёртывание: Task 12. Фронтенд (страницы, ProtectedRoute, стор, офлайн-кэш, тосты): Tasks 13–18. Обработка ошибок: Task 6 (middleware) + Task 13 (ApiError). Тесты: Tasks 7–10 (бэкенд), 13–18 (фронтенд). Критерий «устройство A → устройство B»: покрыт интеграционно (Task 10 state + Task 8 изоляция) и смоук-тестом Task 19.
- Отклонения от спеки зафиксированы: генерация id клиентом (Global Constraints), rate limiting только в production, `resetAll`/`clearAll` удалены из SettingsPage (демо-данных больше нет).
- Порядок: backend (Tasks 1–12) полностью независим от фронтенда; фронтенд (13–19) требует только, чтобы API-контракт был реализован. Бэкенд можно верифицировать без фронтенда и наоборот.

**Placeholder scan:** все шаги содержат конкретный код/команды; единственное место с условием — примечание про типы в Task 8 (приведён конкретный подход с `ids`-маппингом). Плейсхолдеров «TBD/TODO» нет.

**Type consistency:**
- `submitGameRecord` — везде `Promise<boolean>`: Task 17 (стор), Task 18 (страницы).
- `ServerState` — Task 13 (cache), Task 14 (useAuth), Task 17 (стор) — одинаковая структура `Pick<StoreState, ...>`.
- `hydrate(state: ServerState)` / `resetLocal()` — Task 14 и Task 17.
- Фабрика `createEntityRouter(table, schema)` — Task 8 производит `Router` с `POST/PATCH/DELETE`; Task 11 использует для 5 таблиц.
- `runMigrations()` — Task 3 производит, Task 11 (index.ts) и globalSetup используют.

---

## Дельта: вход по логину (без email) + выход в UI (2026-08-09)

**Основание:** решение пользователя после принятия основной спеки. Изменяет контракт авторизации: `email` → `login` (латиница/цифры/`_`/`-`, 3–32), пароль мин. 6 символов; логин отображается в интерфейсе с кнопкой «Выйти». Спека уже обновлена (`2026-08-09-backend-auth-design.md`, разделы 5–8, 13).

### Task D1: Backend — логин вместо email

**Файлы:** `backend/src/db/schema.ts`, миграция `0001`, `backend/src/lib/validation.ts`, `backend/src/routes/auth.ts`, `backend/src/middleware/error.ts`, `backend/test/helpers.ts`, `backend/test/auth.test.ts`.

- [ ] D1.1 Схема: в `users` колонка `email` → `login` (`text('login').unique().notNull()`); остальные колонки без изменений.
- [ ] D1.2 Миграция `backend/drizzle/0001_login_auth.sql`: `ALTER TABLE "users" RENAME COLUMN "email" TO "login";` + запись в `meta/_journal.json` (неразрушающая — уже применённая `0000` и данные сохраняются).
- [ ] D1.3 Валидация (`validation.ts`): `registerSchema`/`loginSchema` — `login: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/)` с русскими сообщениями («Логин должен содержать от 3 до 32 символов», «Логин может содержать только латинские буквы, цифры, _ и -»); `password: z.string().min(6, 'Пароль должен быть не короче 6 символов')`.
- [ ] D1.4 `routes/auth.ts`: регистрация/вход по `{ login, password }` (поиск по `login`); `/auth/me` → `{ id, login }`; ответы без email.
- [ ] D1.5 `middleware/error.ts`: код 23505 для `users.login` → `409 LOGIN_TAKEN` «Логин уже занят».
- [ ] D1.6 Тесты: `helpers.ts` — дефолтный `login = 'user' + random`; `auth.test.ts` — регистрация/вход по логину, дубликат → 409, короткий пароль (5 символов) → 400 с русским сообщением.
- [ ] D1.7 Верификация: `npx tsc --noEmit` + `npx vitest run` (нужен postgres на localhost:5432) — все 24+ теста зелёные.

### Task D2: Frontend — логин, отображение пользователя, выход

**Файлы:** `src/store/useAuth.ts`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AppLayout.tsx` (мобильная шапка), тесты: `src/store/useAuth.test.ts`, `src/pages/LoginPage.test.tsx`, `src/pages/RegisterPage.test.tsx`, `src/App.test.tsx`.

- [ ] D2.1 `useAuth.ts`: `user: { id: string; login: string } | null`; `check()` читает `/auth/me` → `{id, login}`; `login(login, password)` / `register(login, password)`.
- [ ] D2.2 `LoginPage.tsx`: поле «Логин» вместо email (label «Логин», autocomplete «username»), submit → `login(login, password)`.
- [ ] D2.3 `RegisterPage.tsx`: поле «Логин» вместо email, подтверждение пароля остаётся.
- [ ] D2.4 `Sidebar.tsx`: внизу (под «Настройки») блок пользователя — логин + кнопка «Выйти» (`useAuth` → `logout()`; после выхода ProtectedRoute сам редиректит на `/login`).
- [ ] D2.5 `AppLayout.tsx`: в мобильной шапке (рядом с ThemeToggle) — логин + компактная кнопка «Выйти».
- [ ] D2.6 Тесты: обновить моки `user: {id, login}` и вызовы `login/register` (App, useAuth, LoginPage, RegisterPage).
- [ ] D2.7 Верификация: `npm run test` (все зелёные) и `npm run build` — без ошибок.

### Task D3: Валидация после дельты

- [ ] D3.1 `npm --prefix backend test` (24+ теста) и `npm run test` (132 теста) — зелёные.
- [ ] D3.2 `npm run build` (корень) и `npm --prefix backend run build` — без ошибок.
- [ ] D3.3 Пересборка стека (`docker compose up -d --build`) и смоук: регистрация с логином → вход → `/api/auth/me` → `{id, login}` → создание записи → снимок; выход — кука очищается.
- [ ] D3.4 Коммиты: правки спеки и плана, затем реализация.
