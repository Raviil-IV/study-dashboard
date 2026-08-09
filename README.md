# Study Dashboard

Учебное веб-приложение для организации учёбы: расписание, задачи, дедлайны, заметки и таймер фокусировки Pomodoro. Данные хранятся локально в браузере (localStorage).

## Запуск

```bash
npm install
npm run dev
```

Открой http://localhost:5173

## Команды

- `npm run dev` — dev-сервер
- `npm run build` — сборка для продакшена
- `npm run preview` — предпросмотр сборки
- `npm run test` — тесты

## Стек

React 19, Vite 7, TypeScript, React Router, Tailwind CSS 4, Zustand, Vitest.

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
