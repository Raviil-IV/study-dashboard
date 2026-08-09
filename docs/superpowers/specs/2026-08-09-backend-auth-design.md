# Дизайн-спецификация: Бэкенд, база данных и авторизация

Дата: 2026-08-09
Проект: Study Dashboard (React 19 + Vite 7 + TS + Zustand + Tailwind v4)
Статус: черновик, ждёт подтверждения пользователя

## 1. Цель

Превратить полностью клиентское приложение (данные в localStorage) в серверное: собственная база данных, авторизация и регистрация, доступ к своим данным с разных устройств. Развёртывание — на существующем VPS рядом с текущим сайтом, который уже работает через Docker.

## 2. Принятые решения

- **Развёртывание**: VPS, Docker Compose, рядом с текущей nginx-раздачей статики.
- **Бэкенд-стек**: Node.js + Express + TypeScript (тот же язык, что и фронтенд).
- **База данных**: PostgreSQL 17 (`postgres:17-alpine`), том для данных, healthcheck.
- **ORM**: Drizzle (`drizzle-orm` + `drizzle-kit`), миграции в репозитории, применяются при старте backend-контейнера.
- **Авторизация**: JWT в httpOnly-куке (`Secure`, `SameSite=Lax`, срок 7 дней), пароли через `bcrypt` (cost 12).
- **Вход обязательный**: без аккаунта приложение недоступно; localStorage перестаёт быть источником истины (остаётся только офлайн-кэш последнего состояния).
- **Старт чистый**: данные из localStorage в аккаунт не мигрируются; новый пользователь начинает с пустыми коллекциями (демо-данные при первом запуске убираются).
- **Регистрация открытая**: любой желающий может создать аккаунт (email + пароль).
- **Синхронизация поштучная**: CRUD-операции по каждой записи, а не «залить всё состояние целиком» — два устройства не затирают изменения друг друга.

## 3. Архитектура и развёртывание

```
┌────────────┐      ┌─────────────────┐      ┌──────────┐      ┌──────────┐
│  Browser   │─────▶│      nginx      │─────▶│ backend  │─────▶│ postgres │
│ (React SPA)│      │  :80 (всё сайт) │      │  :3000   │      │  :5432   │
└────────────┘      │ /api → backend  │      └──────────┘      └──────────┘
                    └─────────────────┘
```

- Три сервиса в одном `docker-compose.yml`:
  1. `postgres` — `postgres:17-alpine`, именованный том для данных, healthcheck;
  2. `backend` — Node.js + Express (TypeScript), внутренний порт `3000`, наружу не публикуется;
  3. `frontend` — текущий nginx-контейнер: раздаёт статику из `dist`, проксирует `location /api` → `backend:3000`.
- Секреты через `.env` (не в git; рядом коммитится `.env.example`): `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`.
- Миграции: `drizzle-kit generate` → файлы миграций в репозитории → при старте backend-контейнера применяются автоматически (команда `drizzle-kit migrate`, до поднятия HTTP-сервера).
- Бэкапы: скрипт `pg_dump` по cron (вне основной фичи; описывается в README).
- Внешний порт `80` остаётся за nginx: адреса и схема доступа к сайту не меняются, добавляется только путь `/api`.

## 4. Стек

| Слой | Выбор |
|---|---|
| Backend | Node.js + Express 4 + TypeScript |
| ORM | Drizzle (`drizzle-orm/pg`, `drizzle-kit`) |
| Валидация | zod (схемы на каждом endpoint) |
| Пароли | bcrypt (cost 12) |
| Сессия | JWT (`jsonwebtoken`), httpOnly-кука, `cookie-parser` |
| Rate limiting | `express-rate-limit` на `/api/auth/*` |
| Тесты | Vitest + Supertest (тот же раннер, что на фронтенде) |
| БД | PostgreSQL 17 (Docker) |

## 5. Модель данных

Все таблицы данных пользователя — с внешним ключом `user_id` → `users.id`, каскадное удаление при удалении аккаунта. Идентификаторы записей — UUID v4, генерирует **клиент** при создании (`crypto.randomUUID()`), сервер валидирует формат (`z.string().uuid()`) и сохраняет как есть. Отклонение от изначальной формулировки «id генерирует сервер» принято осознанно: клиентская генерация делает оптимистичные обновления стора тривиальными (не нужна подмена временных id), а коллизии UUID v4 практически невозможны.

| Таблица | Колонки |
|---|---|
| `users` | `id uuid PK`, `email text unique not null`, `password_hash text not null`, `created_at timestamptz` |
| `lessons` | `id`, `user_id`, `title`, `type ('weekly'\|'once')`, `weekday smallint`, `start_time time`, `end_time time`, `date date?`, `location text?`, `note text?`, `color text?` |
| `tasks` | `id`, `user_id`, `title`, `subject text?`, `description text?`, `due_date date?`, `priority`, `status`, `created_at timestamptz`, `completed_at timestamptz?` |
| `deadlines` | `id`, `user_id`, `title`, `type`, `subject text?`, `date date`, `time time?`, `note text?`, `created_at timestamptz` |
| `notes` | `id`, `user_id`, `title`, `subject text?`, `content text`, `tags jsonb default []`, `pinned boolean default false`, `created_at`, `updated_at` |
| `focus_sessions` | `id`, `user_id`, `label text?`, `subject text?`, `started_at timestamptz`, `duration_minutes smallint`, `completed boolean` |
| `settings` | `user_id PK/FK`, `theme ('light'\|'dark'\|'system')`, `pomodoro_work_minutes`, `pomodoro_short_break_minutes`, `pomodoro_long_break_minutes` |
| `game_records` | `id`, `user_id`, `game ('memory'\|'snake'\|'minesweeper')`, `difficulty ('easy'\|'medium'\|'hard')`, `best_value int`, уникальный ключ `(user_id, game, difficulty)` |

## 6. API

Все маршруты под `/api`. Все, кроме `/auth/*`, требуют авторизации (middleware читает куку, подставляет `req.userId`; без валидного токена — `401`). Каждый запрос фильтруется по `user_id` из токена.

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/api/auth/register` | `{email, password}` → создаёт пользователя, ставит куку |
| `POST` | `/api/auth/login` | `{email, password}` → ставит куку |
| `POST` | `/api/auth/logout` | выход, чистит куку |
| `GET` | `/api/auth/me` | текущий пользователь (`{id, email}`) — проверка сессии |
| `GET` | `/api/state` | полный снимок всех коллекций пользователя (один запрос при загрузке) |
| `POST` | `/api/lessons` `/api/tasks` `/api/deadlines` `/api/notes` `/api/focus-sessions` | создать запись (клиент передаёт `id` в теле) → возвращает созданную |
| `PATCH` | `/api/:entity/:id` | обновить поля записи |
| `DELETE` | `/api/:entity/:id` | удалить запись |
| `PUT` | `/api/settings` | сохранить настройки |
| `PUT` | `/api/game-records` | `{game, difficulty, value}` — сервер сам решает, побит ли рекорд, и возвращает `{isRecord}` |

Примечание: `POST /api/auth/register` при занятом email — `409`.

## 7. Авторизация и безопасность

- Пароль: минимум 8 символов, проверяется на клиенте и на сервере (zod).
- `bcrypt` cost 12; пароль в БД только в виде хеша.
- JWT (7 дней) в httpOnly-куке с `Secure` и `SameSite=Lax` — недоступен JS, защита от XSS.
- zod-схемы на каждом endpoint — валидация форматов и отбрасывание лишних полей.
- `express-rate-limit`: 10 попыток/минуту с IP на `/api/auth/*`.
- Секреты — только из `.env`.
- Изоляция данных: нет ни одного endpoint без фильтра `user_id`; один пользователь не может прочитать или изменить записи другого (покрывается тестами).
- Вне области MVP: подтверждение email, восстановление пароля, refresh-токены, 2FA, выпуск TLS-сертификатов (если HTTPS на VPS ещё не настроен — отдельная задача; кука `Secure` заработает после настройки TLS).

## 8. Изменения фронтенда

- **Новые страницы**: `/login` и `/register` — формы email + пароль, инлайн-ошибки от сервера, редирект на главную после успеха.
- **Защита маршрутов**: `ProtectedRoute` — при загрузке приложение вызывает `GET /api/auth/me`; `401` → редирект на `/login`.
- **API-клиент**: тонкая обёртка над `fetch` (`credentials: 'same-origin'`), единая обработка ошибок и `401`.
- **Стор `useStore`** (крупнейшая переделка):
  - `persist`-middleware убирается как источник истины;
  - при входе: `GET /api/state` → наполнение стора;
  - каждый экшен (`addTask`, `updateLesson`, …) — оптимистичное обновление локального стора + параллельный запрос `POST/PATCH/DELETE`; при ошибке — откат и уведомление;
  - `settings` и `gameRecords` — отдельные `PUT`-запросы (`submitGameRecord` возвращает `isRecord` с сервера);
  - последнее загруженное состояние кэшируется в localStorage как офлайн-копия (показывается при недоступности сети с плашкой «нет соединения»).
- **Демо-данные** (`demoData.ts`): при старте больше не подставляются; файл остаётся только для тестов либо удаляется.

## 9. Обработка ошибок

- Единый error-handler middleware: ответ `{ error: { code, message } }` с корректным статусом: `400` — невалидные данные, `401` — нет сессии, `404` — запись не найдена, `409` — email занят, `500` — внутренняя ошибка.
- Ошибки валидации zod — человекочитаемые сообщения на русском («Пароль должен быть не короче 8 символов»).
- Детали ошибок БД — только в лог сервера; клиенту — общее «Что-то пошло не так».
- Фронтенд: откат оптимистичного обновления + тост при неудачном запросе; инлайн-сообщения на формах входа/регистрации.

## 10. Тестирование

- **Бэкенд**: Vitest + Supertest, интеграционные тесты против реальной PostgreSQL (тестовая БД, поднимается в docker-compose test-профилем или отдельной командой). Покрытие:
  - регистрация / вход / выход / `me`;
  - изоляция данных: пользователь A не видит и не может изменить данные B;
  - CRUD каждой сущности;
  - валидация (zod), rate limiting;
  - рекорды игр (лучше/хуже рекорда).
- **Фронтенд**: store-тесты мокают API-клиент (оптимистичные обновления, откаты); тесты страниц актуализируются; новые тесты: защита маршрутов, формы входа/регистрации.
- **Сборка**: `npm run build` на фронтенде и бэкенде, `npm run test` — зелёные.

## 11. Структура репозитория (добавления)

```
backend/
  src/
    index.ts          — подъём сервера
    app.ts            — Express-приложение (middleware, роуты)
    db/
      schema.ts       — Drizzle-схема
      client.ts       — пул соединений (DATABASE_URL)
      migrate.ts      — применение миграций при старте
    middleware/
      auth.ts         — проверка JWT-куки → req.userId
      error.ts        — единый error-handler
    routes/
      auth.ts, state.ts, lessons.ts, tasks.ts, deadlines.ts,
      notes.ts, focusSessions.ts, settings.ts, gameRecords.ts
    lib/
      validation.ts   — zod-схемы
      jwt.ts, password.ts
  drizzle/            — сгенерированные миграции
  package.json, tsconfig.json, Dockerfile
docker-compose.yml    — postgres + backend + frontend
.env.example
```

## 12. Вне области

Авторизация через OAuth/соцсети, подтверждение email, восстановление пароля, refresh-токены, 2FA, веб-сокеты/живая синхронизация, CRDT-конфликты, экспорт данных, админ-панель, TLS-терминация на nginx.

## 13. Критерии приёмки

1. `docker compose up` поднимает postgres, backend, frontend; миграции применяются автоматически.
2. Приложение открывается экраном входа; без входа данные недоступны (`/` редиректит на `/login`).
3. Регистрация (email + пароль), вход, выход работают; при занятом email — понятная ошибка.
4. После входа на устройстве A созданные данные видны на устройстве B (полный цикл: создать → обновить → удалить → перезагрузить на другом устройстве).
5. Пользователь A не может прочитать или изменить данные пользователя B.
6. Все CRUD-операции фронтенда работают без перезагрузки; при отказе сервера изменение откатывается с уведомлением.
7. При недоступной сети приложение показывает кэшированные данные с плашкой офлайна.
8. `npm run test` (фронтенд и бэкенд) и `npm run build` — зелёные.
9. Секреты только в `.env`, `.env.example` закоммичен.
