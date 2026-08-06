# Дизайн-спецификация: Study Dashboard

Дата: 2026-08-06
Статус: утверждено пользователем
Источник: `Qwen_markdown_20260806_6f68aj2cx.md` (ТЗ L1-856)

## 1. Цель

Веб-приложение для организации учёбы школьника/студента: расписание занятий, задачи, дедлайны, конспекты и таймер фокусировки Pomodoro в одном месте. MVP полностью клиентское, без бэкенда и внешних API.

## 2. Принятые решения

- **Визуальный стиль — вариант B**: современный учебный дашборд, светлый фон с мягкими тенями, акцентный цвет индиго, цветные метки предметов, скруглённые карточки.
- **Стартовые данные — вариант B**: при первом запуске подставляются демо-данные (их можно удалять и заменять; «почистим потом»).
- **Подход — A**: чистый Vite SPA, кастомные UI-компоненты на Tailwind, Zustand с `persist` для состояния и localStorage.

## 3. Стек

| Слой | Выбор |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Роутинг | React Router v7 |
| Стили | Tailwind CSS v4 (тёмная тема через `dark:`) |
| Состояние | Zustand + `persist`-middleware |
| Данные | `localStorage` (ключи `study-dashboard:*`) |
| ID | `crypto.randomUUID()` |

Интерфейс на русском языке. Адаптив: телефон и компьютер. Без UI-библиотек.

## 4. Состояние и данные

Один Zustand-стор (`useStore`) с коллекциями и экшенами (по одному экшену на операцию: `add`, `update`, `remove` для каждой коллекции, плюс `toggleTask`, `pinNote`, `addFocusSession`, `updateSettings`).

`persist`-middleware пишет данные в localStorage по ключам из ТЗ:

```
study-dashboard:lessons
study-dashboard:tasks
study-dashboard:deadlines
study-dashboard:notes
study-dashboard:focus-sessions
study-dashboard:settings
```

При первом запуске (ключи отсутствуют) — загрузка демо-данных:

- расписание: ~6 занятий на разные дни недели;
- задачи: 5 штук разных статусов/приоритетов, часть с дедлайнами;
- дедлайны: 3 штуки (экзамен, контрольная, проект);
- заметки: 2 штуки с тегами.

При повреждённом JSON в localStorage — fallback на пустые коллекции/дефолтные настройки без падения.

## 5. Типы данных

`src/types/index.ts`, 1:1 с разделом 16 ТЗ:

- `Lesson { id, title, weekday (0–6), startTime, endTime, location?, note?, color? }`
- `Task { id, title, subject?, description?, dueDate?, priority: low|medium|high, status: todo|in-progress|done, createdAt, completedAt? }`
- `Deadline { id, title, type: exam|test|project|homework|other, subject?, date, time?, note?, createdAt }`
- `Note { id, title, subject?, content, tags: string[], pinned, createdAt, updatedAt }`
- `FocusSession { id, label?, subject?, startedAt, durationMinutes, completed }`
- `Settings { theme: light|dark|system, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 }`

## 6. Логика дат и времени (`src/lib/date.ts`)

Утилиты из ТЗ (на нативном `Date`): `formatDate`, `formatTime`, `isToday`, `isOverdue`, `daysUntil`, `getTodayWeekday`. Плюс для расписания: `isLessonNow`, `nextLesson`.

- Даты — ISO `YYYY-MM-DD`, время — строка `HH:MM`.
- Неделя начинается с понедельника; `weekday` хранится как 0 = воскресенье (по ТЗ).

## 7. Структура проекта

```
src/
  components/
    ui/        — Button, Input, Textarea, Select, Modal, Card, Badge,
                 EmptyState, PageHeader, ListItem, Tabs, ProgressBar, IconButton
    layout/    — AppLayout, Sidebar, BottomNav, ThemeToggle
    dashboard/ — TodayTasksCard, UpcomingDeadlinesCard, TodayScheduleCard,
                 FocusQuickStartCard, StatsBar
    schedule/  — WeekView, DayView, LessonForm, LessonCard
    tasks/     — TaskList, TaskItem, TaskForm, TaskFilters
    deadlines/ — DeadlineList, DeadlineItem, DeadlineForm
    notes/     — NoteGrid, NoteCard, NoteForm, NoteSearch
    focus/     — Timer, ModeSwitch, SessionCounter
  pages/       — DashboardPage, SchedulePage, TasksPage, DeadlinesPage,
                 NotesPage, FocusPage, SettingsPage
  hooks/       — useTheme.ts, useLocalStorage.ts
  lib/         — date.ts, storage.ts, constants.ts, demoData.ts
  types/       — index.ts
  App.tsx, main.tsx
```

## 8. Каркас и навигация

- **Desktop**: сайдбар слева — логотип «Study Dashboard», пункты: Главная, Расписание, Задачи, Дедлайны, Заметки, Фокус; внизу — настройки и переключатель темы.
- **Mobile**: компактный header (логотип + тема) и нижнее меню с иконками.
- Контейнер страниц: по центру, максимальная ширина ~1100px.

Маршруты: `/`, `/schedule`, `/tasks`, `/deadlines`, `/notes`, `/focus`, `/settings`.

## 9. Визуальный стиль

- Светлая тема по умолчанию, тёмная и «системная» (`Settings.theme`).
- Карточки `rounded-xl`, мягкие тени, аккуратные отступы, системный шрифт.
- Акцент: индиго (`indigo-500/600`).
- Палитра предметов: 8 цветов (синий, зелёный, оранжевый, розовый, фиолетовый, бирюзовый, жёлтый, серый) — цветная метка-бейдж.

## 10. Страницы

1. **Главная `/`** — приветствие с датой («Привет! Сегодня четверг, 6 августа»); карточки: задачи на сегодня, ближайшие дедлайны (с цветовой маркировкой дней), расписание на сегодня, быстрый старт фокусировки; статистика (задач выполнено / занятий сегодня / дедлайнов скоро).
2. **Расписание `/schedule`** — переключатель «день / неделя», неделя с понедельника; форма занятия в модалке (предмет, день, время начала/конца, кабинет/ссылка, заметка, цвет); сортировка по времени; метки «идёт сейчас» и «следующее занятие».
3. **Задачи `/tasks`** — список с чекбоксом выполнения; фильтры: статус, приоритет, предмет, «на сегодня», «просроченные»; сортировка; модалка создания/редактирования.
4. **Дедлайны `/deadlines`** — вкладки «будущие / прошедшие», сортировка по дате, счётчик дней: красный 0–2 дня, жёлтый 3–7, зелёный >7.
5. **Заметки `/notes`** — сетка карточек, поиск по названию и содержимому, закрепление, предмет, теги, `textarea` для контента.
6. **Фокус `/focus`** — Pomodoro: режимы работа/короткий/длинный перерыв (длительности из настроек), прогресс-полоса, старт/пауза/сброс, счётчик «сессия 2 из 4», привязка к предмету/задаче; завершённые сессии сохраняются.
7. **Настройки `/settings`** — тема (light/dark/system), длительности Pomodoro.

## 11. UI-компоненты

Кастомные, на Tailwind, с поддержкой тёмной темы: `Button`, `Input`, `Textarea`, `Select`, `Modal`, `Card`, `Badge`, `EmptyState`, `PageHeader`, `ListItem`, `Tabs`, `ProgressBar`, `IconButton`.

## 12. Обработка ошибок и краевые случаи

- Пустые состояния с подсказкой («Пока нет задач. Добавь первую задачу, чтобы начать учиться»).
- Валидация форм: обязательные поля; время конца занятия позже времени начала.
- Повреждённый localStorage → дефолтные значения без падения.

## 13. Порядок реализации

По ТЗ (10 шагов): инициализация Vite → layout/навигация/тема → стор и демо-данные → расписание → задачи → дедлайны → заметки → таймер → главная → полировка. Контроль: `npm run build` после каждого шага, ручная проверка критериев готовности MVP (раздел 20 ТЗ).

## 14. Вне области MVP

Авторизация, бэкенд, БД, интеграции (Google Calendar, API вуза), синхронизация, уведомления, rich-text, экспорт, платные функции — не реализуются.
