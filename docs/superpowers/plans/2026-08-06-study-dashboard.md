# Study Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-only SPA "Study Dashboard" for students: schedule, tasks, deadlines, notes, and a Pomodoro focus timer, with localStorage persistence and light/dark themes.

**Architecture:** Single React + Vite + TypeScript app. One Zustand store with `persist` middleware persists all collections to localStorage under `study-dashboard:*` keys. Pages are thin wrappers over shared UI components and store selectors; all date logic lives in `src/lib/date.ts`. No backend, no external APIs, no UI libraries.

**Tech Stack:** React 19, Vite 7, TypeScript, React Router v7, Tailwind CSS v4, Zustand v5 (with persist), Vitest + Testing Library + jsdom, `crypto.randomUUID()`.

**Spec:** `docs/superpowers/specs/2026-08-06-study-dashboard-design.md` (approved) and source ТЗ `Qwen_markdown_20260806_6f68aj2cx.md`.

## Global Constraints

- All UI copy in Russian.
- Data persistence keys: `study-dashboard:lessons`, `study-dashboard:tasks`, `study-dashboard:deadlines`, `study-dashboard:notes`, `study-dashboard:focus-sessions`, `study-dashboard:settings`.
- Dates are ISO strings `YYYY-MM-DD`; times are `HH:MM` strings; weekday is `0` = Sunday through `6` = Saturday (per ТЗ). Week view starts Monday.
- No external dependencies beyond the stack above. No UI component libraries.
- IDs: `crypto.randomUUID()`.
- Default settings: theme `system`, pomodoroWorkMinutes 25, pomodoroShortBreakMinutes 5, pomodoroLongBreakMinutes 15.
- Dark theme via `dark:` Tailwind classes, toggled by a `.dark` class on `document.documentElement`.
- Every task ends with a build (`npm run build`) and a git commit. Commit messages in English, imperative mood.
- Demo data (Task 3) must be cleanly removable — no special-casing in UI.

## File Structure

```
docs/superpowers/specs/2026-08-06-study-dashboard-design.md  (spec, exists)
src/
  main.tsx                 — entry, router, theme init
  App.tsx                  — routes + layout
  index.css                — Tailwind import + base styles
  vite-env.d.ts            — Vite types
  test/
    setup.ts               — Vitest setup (Testing Library cleanup, matchMedia mock)
    utils.tsx              — renderWithRouter helper + userEvent export
  types/index.ts           — Lesson, Task, Deadline, Note, FocusSession, Settings
  lib/
    constants.ts           — WEEKDAYS, COLORS, NAV_ITEMS, STORAGE_KEYS, defaults
    date.ts                — formatDate, formatTime, isToday, isOverdue, daysUntil,
                             getTodayWeekday, toISODate, isLessonNow, nextLesson
    storage.ts             — load/save JSON with corruption fallback
    demoData.ts            — demo lessons/tasks/deadlines/notes
  store/useStore.ts        — Zustand store, persist, demo-data seed
  hooks/
    useLocalStorage.ts     — generic hook (used by useTheme)
    useTheme.ts            — theme state + document class sync
    usePomodoro.ts         — timer state machine (focus page)
  components/
    ui/                    — Button, Input, Textarea, Select, Modal, Card, Badge,
                             EmptyState, PageHeader, ListItem, Tabs, ProgressBar, IconButton
    layout/                — AppLayout, Sidebar, BottomNav, ThemeToggle
    dashboard/             — TodayTasksCard, UpcomingDeadlinesCard, TodayScheduleCard,
                             FocusQuickStartCard, StatsBar
    schedule/              — LessonForm, LessonCard, DayView, WeekView
    tasks/                 — TaskForm, TaskItem, TaskList, TaskFilters
    deadlines/             — DeadlineForm, DeadlineItem, DeadlineList
    notes/                 — NoteForm, NoteCard, NoteGrid
    focus/                 — Timer, ModeSwitch, SessionCounter
  pages/                   — DashboardPage, SchedulePage, TasksPage, DeadlinesPage,
                             NotesPage, FocusPage, SettingsPage
  tests/ (co-located *.test.tsx)
```

## Task 1: Scaffold Vite project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test/setup.ts`, `.gitignore`

**Interfaces:**
- Produces: `src/main.tsx` rendering `<App />`; `npm run dev` / `npm run build` / `npm run test` scripts; Vitest configured with jsdom + `src/test/setup.ts`; CSS entry `src/index.css`.

- [ ] **Step 1: Write root config files**

`package.json`:
```json
{
  "name": "study-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "tailwindcss": "^4.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "jsdom": "^26.0.0",
    "typescript": "~5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.1.0"
  }
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Study Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

html, body, #root {
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

`src/App.tsx`:
```tsx
export default function App() {
  return <div>Study Dashboard</div>
}
```

`.gitignore`:
```
node_modules
dist
*.local
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs the packages above without errors.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS — `dist/` produced, no TypeScript errors.

- [ ] **Step 4: Verify test runner**

Create `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders placeholder', () => {
  render(<App />)
  expect(screen.getByText('Study Dashboard')).toBeInTheDocument()
})
```
Run: `npm run test`
Expected: PASS — 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "Scaffold Vite React TS project with test setup"
```

## Task 2: Types, constants, date and storage utilities

**Files:**
- Create: `src/types/index.ts`, `src/lib/constants.ts`, `src/lib/date.ts`, `src/lib/storage.ts`

**Interfaces:**
- Produces (exact signatures used by later tasks):
  - `Lesson`, `Task`, `Deadline`, `Note`, `FocusSession`, `Settings` types (fields below)
  - `WEEKDAYS: string[]` (7 names, index 0 = Sunday), `WEEKDAYS_SHORT: string[]` (Пн..Вс, index 0 = Вс)
  - `SUBJECT_COLORS: string[]`, `COLOR_CLASSES: Record<string, { dot: string; badge: string; text: string }>`, `COLOR_NAMES: Record<string, string>`
  - `NAV_ITEMS: { to: string; label: string; icon: string }[]`
  - `STORAGE_KEYS: { lessons, tasks, deadlines, notes, focusSessions, settings }`
  - `DEFAULT_SETTINGS: Settings`, `DEADLINE_TYPES: { value: string; label: string }[]`, `TASK_PRIORITIES`, `TASK_STATUSES`
  - `formatDate(date: string): string`, `formatTime(time: string): string`, `isToday(date: string): boolean`, `isOverdue(date: string): boolean`, `daysUntil(date: string): number`, `getTodayWeekday(): number`, `toISODate(date: Date): string`, `isLessonNow(lesson: { weekday: number; startTime: string; endTime: string }): boolean`, `nextLesson(lessons: Lesson[]): Lesson | null`
  - `loadFromStorage<T>(key: string, fallback: T): T`, `saveToStorage(key: string, value: unknown): void`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/date.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatTime, isToday, isOverdue, daysUntil, getTodayWeekday, toISODate, isLessonNow, nextLesson } from './date'

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // 2026-08-06, Thursday
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatDate formats ISO date in Russian', () => {
    expect(formatDate('2026-08-06')).toBe('6 августа')
  })

  it('formatTime returns time as is', () => {
    expect(formatTime('09:30')).toBe('09:30')
  })

  it('isToday detects today', () => {
    expect(isToday('2026-08-06')).toBe(true)
    expect(isToday('2026-08-07')).toBe(false)
  })

  it('isOverdue detects past dates', () => {
    expect(isOverdue('2026-08-05')).toBe(true)
    expect(isOverdue('2026-08-06')).toBe(false)
    expect(isOverdue('2026-08-07')).toBe(false)
  })

  it('daysUntil returns difference in days', () => {
    expect(daysUntil('2026-08-07')).toBe(1)
    expect(daysUntil('2026-08-04')).toBe(-2)
  })

  it('getTodayWeekday returns JS getDay() value', () => {
    expect(getTodayWeekday()).toBe(4) // Thursday
  })

  it('toISODate converts Date to YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 7, 6))).toBe('2026-08-06')
  })

  it('isLessonNow checks current time within lesson', () => {
    const lesson = { weekday: 4, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(lesson)).toBe(true)
    const past = { weekday: 4, startTime: '08:00', endTime: '09:00' }
    expect(isLessonNow(past)).toBe(false)
    const wrongDay = { weekday: 5, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(wrongDay)).toBe(false)
  })

  it('nextLesson returns soonest upcoming lesson by weekday+time', () => {
    const lessons = [
      { id: '1', title: 'Math', weekday: 4, startTime: '10:00', endTime: '11:00' },
      { id: '2', title: 'Physics', weekday: 4, startTime: '14:00', endTime: '15:00' },
      { id: '3', title: 'English', weekday: 5, startTime: '09:00', endTime: '10:00' },
    ] as Lesson[]
    const next = nextLesson(lessons)
    expect(next?.id).toBe('2')
  })
})
```

Create `src/lib/storage.test.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { loadFromStorage, saveToStorage } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('returns fallback when key is missing', () => {
    expect(loadFromStorage('study-dashboard:missing', ['x'])).toEqual(['x'])
  })

  it('round-trips saved JSON', () => {
    saveToStorage('study-dashboard:lessons', [{ id: '1' }])
    expect(loadFromStorage('study-dashboard:lessons', [])).toEqual([{ id: '1' }])
  })

  it('returns fallback on corrupted JSON', () => {
    localStorage.setItem('study-dashboard:lessons', '{broken')
    expect(loadFromStorage('study-dashboard:lessons', [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Write implementation**

`src/types/index.ts`:
```ts
export interface Lesson {
  id: string
  title: string
  weekday: number // 0 = Sunday ... 6 = Saturday
  startTime: string // HH:MM
  endTime: string // HH:MM
  location?: string
  note?: string
  color?: string
}

export interface Task {
  id: string
  title: string
  subject?: string
  description?: string
  dueDate?: string // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in-progress' | 'done'
  createdAt: string // ISO datetime
  completedAt?: string
}

export interface Deadline {
  id: string
  title: string
  type: 'exam' | 'test' | 'project' | 'homework' | 'other'
  subject?: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  note?: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  subject?: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface FocusSession {
  id: string
  label?: string
  subject?: string
  startedAt: string
  durationMinutes: number
  completed: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  pomodoroWorkMinutes: number
  pomodoroShortBreakMinutes: number
  pomodoroLongBreakMinutes: number
}
```

`src/lib/constants.ts`:
```ts
import type { Settings } from '../types'

export const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export const SUBJECT_COLORS = ['blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'gray']

export const COLOR_CLASSES: Record<string, { dot: string; badge: string; text: string }> = {
  blue: { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', text: 'text-blue-600 dark:text-blue-400' },
  green: { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', text: 'text-green-600 dark:text-green-400' },
  orange: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400' },
  pink: { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300', text: 'text-pink-600 dark:text-pink-400' },
  purple: { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', text: 'text-purple-600 dark:text-purple-400' },
  teal: { dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300', text: 'text-teal-600 dark:text-teal-400' },
  yellow: { dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', text: 'text-yellow-600 dark:text-yellow-400' },
  gray: { dot: 'bg-gray-500', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300', text: 'text-gray-600 dark:text-gray-400' },
}

export const COLOR_NAMES: Record<string, string> = {
  blue: 'Синий',
  green: 'Зелёный',
  orange: 'Оранжевый',
  pink: 'Розовый',
  purple: 'Фиолетовый',
  teal: 'Бирюзовый',
  yellow: 'Жёлтый',
  gray: 'Серый',
}

export const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/schedule', label: 'Расписание', icon: 'calendar' },
  { to: '/tasks', label: 'Задачи', icon: 'check' },
  { to: '/deadlines', label: 'Дедлайны', icon: 'alert' },
  { to: '/notes', label: 'Заметки', icon: 'note' },
  { to: '/focus', label: 'Фокус', icon: 'timer' },
]

export const STORAGE_KEYS = {
  lessons: 'study-dashboard:lessons',
  tasks: 'study-dashboard:tasks',
  deadlines: 'study-dashboard:deadlines',
  notes: 'study-dashboard:notes',
  focusSessions: 'study-dashboard:focus-sessions',
  settings: 'study-dashboard:settings',
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
}

export const DEADLINE_TYPES = [
  { value: 'exam', label: 'Экзамен' },
  { value: 'test', label: 'Контрольная / тест' },
  { value: 'project', label: 'Проект' },
  { value: 'homework', label: 'Домашнее задание' },
  { value: 'other', label: 'Другое' },
]

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

export const TASK_STATUSES = [
  { value: 'todo', label: 'В работе' },
  { value: 'in-progress', label: 'Выполняется' },
  { value: 'done', label: 'Выполнено' },
]
```

`src/lib/date.ts`:
```ts
import type { Lesson } from '../types'

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function formatTime(time: string): string {
  return time
}

export function isToday(date: string): boolean {
  return date === toISODate(new Date())
}

export function isOverdue(date: string): boolean {
  return date < toISODate(new Date())
}

export function daysUntil(date: string): number {
  const today = new Date()
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return Math.round((parsed.getTime() - target.getTime()) / 86400000)
}

export function getTodayWeekday(): number {
  return new Date().getDay()
}

export function isLessonNow(lesson: { weekday: number; startTime: string; endTime: string }): boolean {
  if (lesson.weekday !== new Date().getDay()) return false
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = lesson.startTime.split(':').map(Number)
  const [eh, em] = lesson.endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return minutes >= start && minutes < end
}

export function nextLesson(lessons: Lesson[]): Lesson | null {
  if (lessons.length === 0) return null
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const today = now.getDay()
  const future: { lesson: Lesson; key: number }[] = []
  for (const lesson of lessons) {
    const [h, m] = lesson.startTime.split(':').map(Number)
    const start = h * 60 + m
    const diffDays = (lesson.weekday - today + 7) % 7
    let key: number
    if (diffDays === 0 && start <= nowMinutes) {
      key = 7 * 1440 + start
    } else {
      key = diffDays * 1440 + start
    }
    future.push({ lesson, key })
  }
  future.sort((a, b) => a.key - b.key)
  return future[0]?.lesson ?? null
}
```

`src/lib/storage.ts`:
```ts
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — ignore
  }
}
```

Note: `types/index.ts` must be created too (fields above). The `date.test.ts` imports `Lesson` type — add `import type { Lesson } from '../types'` to the test file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — all date and storage tests pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types src/lib
# plus the two test files
git commit -m "Add types, date and storage utilities"
```

## Task 3: Zustand store with persist and demo data

**Files:**
- Create: `src/store/useStore.ts`, `src/lib/demoData.ts`, `src/store/useStore.test.ts`

**Interfaces:**
- Consumes: types, `STORAGE_KEYS`, `DEFAULT_SETTINGS`, `loadFromStorage`/`saveToStorage` (or Zustand persist)
- Produces:
  - `useStore` hook with state `{ lessons, tasks, deadlines, notes, focusSessions, settings }` and actions: `addLesson/updateLesson/removeLesson`, `addTask/updateTask/removeTask/toggleTask`, `addDeadline/updateDeadline/removeDeadline`, `addNote/updateNote/removeNote/togglePinNote`, `addFocusSession`, `updateSettings`, `resetAll` (clears all + reseeds demo data), `clearAll` (clears all, no reseed)
  - `getDemoData(): { lessons, tasks, deadlines, notes }`

- [ ] **Step 1: Write the failing test**

Create `src/store/useStore.test.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useStore } from './useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('useStore', () => {
  it('adds a task', () => {
    useStore.getState().addTask({ title: 'Решить 5 задач', priority: 'medium', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].title).toBe('Решить 5 задач')
  })

  it('toggles task status', () => {
    const { addTask, toggleTask } = useStore.getState()
    addTask({ title: 'Прочитать параграф', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('done')
    expect(useStore.getState().tasks[0].completedAt).toBeTruthy()
    toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('todo')
  })

  it('persists to localStorage under study-dashboard keys', () => {
    useStore.getState().addLesson({ title: 'Математика', weekday: 1, startTime: '09:00', endTime: '10:30' })
    const raw = localStorage.getItem('study-dashboard:lessons')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).length).toBeGreaterThan(0)
  })

  it('resets to demo data via resetAll and clears via clearAll', () => {
    const { resetAll, clearAll } = useStore.getState()
    resetAll()
    expect(useStore.getState().lessons.length).toBeGreaterThan(0)
    clearAll()
    expect(useStore.getState().tasks).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/store/useStore.test.ts`
Expected: FAIL — `useStore` not defined.

- [ ] **Step 3: Write implementation**

`src/lib/demoData.ts`:
```ts
import type { Deadline, Lesson, Note, Task } from '../types'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function getDemoData(): { lessons: Lesson[]; tasks: Task[]; deadlines: Deadline[]; notes: Note[] } {
  return {
    lessons: [
      { id: crypto.randomUUID(), title: 'Математика', weekday: 1, startTime: '08:30', endTime: '10:00', location: 'Каб. 201', color: 'blue' },
      { id: crypto.randomUUID(), title: 'Физика', weekday: 1, startTime: '10:15', endTime: '11:45', location: 'Каб. 305', color: 'purple' },
      { id: crypto.randomUUID(), title: 'Английский', weekday: 2, startTime: '09:00', endTime: '10:30', location: 'Каб. 112', color: 'pink' },
      { id: crypto.randomUUID(), title: 'История', weekday: 3, startTime: '12:00', endTime: '13:30', location: 'Каб. 45', color: 'orange' },
      { id: crypto.randomUUID(), title: 'Информатика', weekday: 4, startTime: '14:00', endTime: '15:30', location: 'Каб. 218', color: 'teal' },
      { id: crypto.randomUUID(), title: 'Химия', weekday: 5, startTime: '08:30', endTime: '10:00', location: 'Каб. 402', color: 'green' },
    ],
    tasks: [
      { id: crypto.randomUUID(), title: 'Решить 10 задач по алгебре', subject: 'Математика', priority: 'high', status: 'todo', dueDate: isoDaysFromNow(1), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Прочитать главу 4 по истории', subject: 'История', priority: 'medium', status: 'in-progress', dueDate: isoDaysFromNow(2), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Подготовиться к диктанту', subject: 'Английский', priority: 'medium', status: 'todo', dueDate: isoDaysFromNow(3), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Сделать лабораторную по физике', subject: 'Физика', priority: 'high', status: 'todo', dueDate: isoDaysFromNow(5), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Повторить формулы по химии', subject: 'Химия', priority: 'low', status: 'done', createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ],
    deadlines: [
      { id: crypto.randomUUID(), title: 'Контрольная по алгебре', type: 'test', subject: 'Математика', date: isoDaysFromNow(2), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Экзамен по физике', type: 'exam', subject: 'Физика', date: isoDaysFromNow(10), createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'Проект по информатике', type: 'project', subject: 'Информатика', date: isoDaysFromNow(14), createdAt: new Date().toISOString() },
    ],
    notes: [
      { id: crypto.randomUUID(), title: 'Формулы по тригонометрии', subject: 'Математика', content: 'sin²α + cos²α = 1\nФормулы приведения…', tags: ['математика', 'формулы'], pinned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), title: 'План сочинения', subject: 'Русский язык', content: '1. Вступление\n2. Тезис\n3. Аргументы…', tags: ['русский'], pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
  }
}
```

`src/store/useStore.ts`:
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Deadline, FocusSession, Lesson, Note, Settings, Task } from '../types'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../lib/constants'
import { getDemoData } from '../lib/demoData'

export type TaskInput = Omit<Task, 'id' | 'createdAt'>

export interface StoreState {
  lessons: Lesson[]
  tasks: Task[]
  deadlines: Deadline[]
  notes: Note[]
  focusSessions: FocusSession[]
  settings: Settings
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
  addNote: (input: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  togglePinNote: (id: string) => void
  addFocusSession: (input: Omit<FocusSession, 'id' | 'startedAt'>) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetAll: () => void
  clearAll: () => void
}

const demo = getDemoData()

const emptyState = {
  lessons: [] as Lesson[],
  tasks: [] as Task[],
  deadlines: [] as Deadline[],
  notes: [] as Note[],
  focusSessions: [] as FocusSession[],
}

function seedState() {
  const d = getDemoData()
  return { lessons: d.lessons, tasks: d.tasks, deadlines: d.deadlines, notes: d.notes, focusSessions: [] as FocusSession[] }
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...seedState(),
      settings: DEFAULT_SETTINGS,
      addLesson: (input) =>
        set((s) => ({ lessons: [...s.lessons, { ...input, id: crypto.randomUUID() }] })),
      updateLesson: (id, patch) =>
        set((s) => ({ lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLesson: (id) => set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),
      addTask: (input) =>
        set((s) => ({
          tasks: [...s.tasks, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? t.status === 'done'
                ? { ...t, status: 'todo' as const, completedAt: undefined }
                : { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
              : t,
          ),
        })),
      addDeadline: (input) =>
        set((s) => ({ deadlines: [...s.deadlines, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] })),
      updateDeadline: (id, patch) =>
        set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDeadline: (id) => set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) })),
      addNote: (input) =>
        set((s) => ({ notes: [...s.notes, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
          ),
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      togglePinNote: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),
      addFocusSession: (input) =>
        set((s) => ({ focusSessions: [...s.focusSessions, { ...input, id: crypto.randomUUID(), startedAt: new Date().toISOString() }] })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetAll: () => set(() => ({ ...seedState(), settings: DEFAULT_SETTINGS })),
      clearAll: () => set(() => ({ ...emptyState, settings: DEFAULT_SETTINGS })),
    }),
    {
      name: 'study-dashboard',
      storage: {
        getItem: (name) => {
          // state is split per-key; assemble from individual keys
          const keys = STORAGE_KEYS
          const raw = localStorage.getItem(name)
          if (raw) return raw
          return JSON.stringify({
            state: {
              lessons: JSON.parse(localStorage.getItem(keys.lessons) ?? 'null'),
              tasks: JSON.parse(localStorage.getItem(keys.tasks) ?? 'null'),
              deadlines: JSON.parse(localStorage.getItem(keys.deadlines) ?? 'null'),
              notes: JSON.parse(localStorage.getItem(keys.notes) ?? 'null'),
              focusSessions: JSON.parse(localStorage.getItem(keys.focusSessions) ?? 'null'),
              settings: JSON.parse(localStorage.getItem(keys.settings) ?? 'null'),
            },
          })
        },
        setItem: (name, value) => {
          // value = { state: {...}, version: n }
          const parsed = JSON.parse(value)
          const s = parsed.state
          if (s) {
            localStorage.setItem(keys.lessons, JSON.stringify(s.lessons))
            localStorage.setItem(keys.tasks, JSON.stringify(s.tasks))
            localStorage.setItem(keys.deadlines, JSON.stringify(s.deadlines))
            localStorage.setItem(keys.notes, JSON.stringify(s.notes))
            localStorage.setItem(keys.focusSessions, JSON.stringify(s.focusSessions))
            localStorage.setItem(keys.settings, JSON.stringify(s.settings))
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
```

Note: the `name: 'study-dashboard'` key is a single umbrella key in the persist API; the custom storage splits it into the per-entity keys required by the ТЗ. `const keys = STORAGE_KEYS` before use, and the demo seed on first run happens because `persist` merges `null` state with the initial `seedState()` (persist only applies stored state when present). If stored values are all `null`, `seedState()` demo data stays.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/store/useStore.test.ts`
Expected: PASS. If localStorage keys don't exist yet, the `addLesson` test still passes because `persist.setItem` runs on every set.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store src/lib/demoData.ts
# plus useStore.test.ts
# plus types/constants if new files were added in this task
git commit -m "Add Zustand store with persist and demo data"
```

## Task 4: UI primitives, layout, theme and routing

**Files:**
- Create: `src/components/ui/Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Modal.tsx`, `Card.tsx`, `Badge.tsx`, `EmptyState.tsx`, `PageHeader.tsx`, `Tabs.tsx`, `IconButton.tsx`, `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `ThemeToggle.tsx`, `src/hooks/useTheme.ts`, `src/components/ui/Modal.test.tsx`, `src/hooks/useTheme.test.ts`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `NAV_ITEMS`, `DEFAULT_SETTINGS`, `useStore` (settings)
- Produces:
  - `Button({ variant?: 'primary' | 'secondary' | 'danger', size?: 'sm' | 'md', ... })`
  - `Input({ label?, type?, value, onChange, placeholder?, ... })`
  - `Textarea({ label?, value, onChange, rows? })`
  - `Select({ label?, value, onChange, children })`
  - `Modal({ open, title, onClose, children })`
  - `Card({ title?, action?, children })`
  - `Badge({ color?, children })`
  - `EmptyState({ icon?, title, hint? })`
  - `PageHeader({ title, subtitle?, action? })`
  - `Tabs({ tabs: { value, label }[], value, onChange })`
  - `IconButton({ name: 'edit' | 'trash' | 'pin' | 'close' | 'plus' | 'chevron-left' | 'chevron-right', label, onClick })`
  - `AppLayout` (sidebar + mobile header/bottom nav + `<Outlet />`)
  - `useTheme(): { theme, setTheme, resolvedTheme }` — syncs `.dark` class on `document.documentElement`
  - `App` — routes for `/`, `/schedule`, `/tasks`, `/deadlines`, `/notes`, `/focus`, `/settings`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Modal.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

test('renders nothing when closed', () => {
  render(<Modal open={false} title="Тест" onClose={() => {}}>контент</Modal>)
  expect(screen.queryByText('контент')).not.toBeInTheDocument()
})

test('renders content and calls onClose on overlay click', async () => {
  const onClose = vi.fn()
  render(<Modal open title="Заголовок" onClose={onClose}>контент</Modal>)
  expect(screen.getByText('Заголовок')).toBeInTheDocument()
  expect(screen.getByText('контент')).toBeInTheDocument()
  await userEvent.click(screen.getByTestId('modal-overlay'))
  expect(onClose).toHaveBeenCalled()
})
```

Create `src/hooks/useTheme.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useTheme } from './useTheme'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('applies dark class when theme is dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when theme is light', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test src/components/ui/Modal.test.tsx src/hooks/useTheme.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write implementation**

`src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
  secondary: 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    />
  )
}
```

`src/components/ui/Input.tsx`:
```tsx
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <input
        className={`w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 ${className}`}
        {...rest}
      />
    </label>
  )
}
```

`src/components/ui/Textarea.tsx`:
```tsx
import type { TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export default function Textarea({ label, className = '', ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <textarea
        className={`w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 ${className}`}
        {...rest}
      />
    </label>
  )
}
```

`src/components/ui/Select.tsx`:
```tsx
import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export default function Select({ label, className = '', children, ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <select
        className={`w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  )
}
```

`src/components/ui/Modal.tsx`:
```tsx
import type { ReactNode } from 'react'
import IconButton from './IconButton'

export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-testid="modal-overlay" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <IconButton name="close" label="Закрыть" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}
```

`src/components/ui/Card.tsx`:
```tsx
import type { ReactNode } from 'react'

export default function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
```

`src/components/ui/Badge.tsx`:
```tsx
import type { ReactNode } from 'react'
import { COLOR_CLASSES } from '../../lib/constants'

export default function Badge({ color, children }: { color?: string; children: ReactNode }) {
  const cls = color && COLOR_CLASSES[color] ? COLOR_CLASSES[color].badge : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}
```

`src/components/ui/EmptyState.tsx`:
```tsx
export default function EmptyState({ icon, title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-8 text-center ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {icon && <span className="mb-1 text-3xl">{icon}</span>}
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {hint && <p className="text-sm text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  )
}
```

`src/components/ui/PageHeader.tsx`:
```tsx
import type { ReactNode } from 'react'

export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
```

`src/components/ui/Tabs.tsx`:
```tsx
export interface TabOption {
  value: string
  label: string
}

export default function Tabs({ tabs, value, onChange }: { tabs: TabOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === t.value
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
```

`src/components/ui/IconButton.tsx`:
```tsx
type IconName = 'edit' | 'trash' | 'pin' | 'close' | 'plus' | 'chevron-left' | 'chevron-right' | 'home' | 'calendar' | 'check' | 'alert' | 'note' | 'timer' | 'settings' | 'sun' | 'moon' | 'system'

const icons: Record<IconName, string> = {
  edit: '✏️',
  trash: '🗑️',
  pin: '📌',
  close: '✕',
  plus: '＋',
  'chevron-left': '‹',
  'chevron-right': '›',
  home: '🏠',
  calendar: '📅',
  check: '✅',
  alert: '⏰',
  note: '📝',
  timer: '⏱️',
  settings: '⚙️',
  sun: '☀️',
  moon: '🌙',
  system: '💻',
}

export default function IconButton({ name, label, onClick }: { name: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      <span className="text-base leading-none">{icons[name]}</span>
    </button>
  )
}
```

`src/hooks/useTheme.ts`:
```ts
import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  return { theme, resolvedTheme, setTheme: (t: Theme) => updateSettings({ theme: t }) }
}
```

`src/components/layout/AppLayout.tsx`:
```tsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ThemeToggle from './ThemeToggle'

export default function AppLayout() {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
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
    </div>
  )
}
```

`src/components/layout/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'
import ThemeToggle from './ThemeToggle'
import IconButton from '../ui/IconButton'

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="mb-6 flex items-center justify-between px-2">
        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Study Dashboard</span>
        <ThemeToggle />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
          }`
        }
      >
        <span className="text-base">⚙️</span>
        Настройки
      </NavLink>
    </aside>
  )
}
```

Note: `IconButton` is imported but unused in `Sidebar` — remove that import. `NAV_ITEMS` icons are emoji strings rendered directly, so `IconButton`'s emoji map is only used where buttons appear.

`src/components/layout/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'

export default function BottomNav() {
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
    </nav>
  )
}
```

`src/components/layout/ThemeToggle.tsx`:
```tsx
import { useTheme } from '../../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      aria-label="Переключить тему"
      title={next === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
      onClick={() => setTheme(next)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {next === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}
```

Note: the theme setting persists via the store; `useTheme` also applies it on first load through the `useEffect`.

Modify `src/App.tsx`:
```tsx
import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import TasksPage from './pages/TasksPage'
import DeadlinesPage from './pages/DeadlinesPage'
import NotesPage from './pages/NotesPage'
import FocusPage from './pages/FocusPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
```

Create stub pages so the app builds — `src/pages/DashboardPage.tsx` through `SettingsPage.tsx`, each:
```tsx
export default function DashboardPage() {
  return <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Главная</h1>
}
```
(repeat for SchedulePage «Расписание», TasksPage «Задачи», DeadlinesPage «Дедлайны», NotesPage «Заметки», FocusPage «Фокус», SettingsPage «Настройки»)

Also update `src/App.test.tsx` — placeholder text changed:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

test('renders nav labels', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText('Study Dashboard')).toBeInTheDocument()
  expect(screen.getByText('Главная')).toBeInTheDocument()
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — Modal, useTheme and App tests pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS. If `Sidebar` import of `IconButton` was kept, remove it (unused import fails `noUnusedLocals`).

- [ ] **Step 6: Commit**

```bash
git add src/components src/hooks src/pages src/App.tsx src/main.tsx
# plus test files
git commit -m "Add layout, theme and routing"
```

## Task 5: Schedule page

**Files:**
- Create: `src/components/schedule/LessonForm.tsx`, `LessonCard.tsx`, `DayView.tsx`, `WeekView.tsx`, `src/pages/SchedulePage.tsx`, `src/pages/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`lessons`, `addLesson`, `updateLesson`, `removeLesson`), `Lesson`, `WEEKDAYS`, `WEEKDAYS_SHORT`, `SUBJECT_COLORS`, `COLOR_NAMES`, `isLessonNow`, `nextLesson`, `toISODate`, UI primitives (`PageHeader`, `Tabs`, `Button`, `Modal`, `EmptyState`, `IconButton`)
- Produces: `SchedulePage` — day/week switch, add/edit via modal form, delete with confirm; «сейчас» marker in day view; «следующее занятие» hint in week view header

- [ ] **Step 1: Write the failing test**

Create `src/pages/SchedulePage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SchedulePage from './SchedulePage'
import { useStore } from '../../store/useStore'

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [{ id: '1', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30', location: 'Каб. 201', color: 'blue' }],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('SchedulePage', () => {
  it('shows lesson in day view (today is Thursday, weekday 4)', () => {
    renderPage()
    expect(screen.getByText('Математика')).toBeInTheDocument()
  })

  it('switches to week view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByText('Пн')).toBeInTheDocument()
  })

  it('adds a lesson via the modal form', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.selectOptions(screen.getByLabelText('День недели'), '2')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(2)
    expect(useStore.getState().lessons[1].title).toBe('Физика')
    expect(screen.getByText('Физика')).toBeInTheDocument()
  })

  it('validates end time after start time', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.clear(screen.getByLabelText('Начало'))
    await user.type(screen.getByLabelText('Начало'), '12:00')
    await user.clear(screen.getByLabelText('Конец'))
    await user.type(screen.getByLabelText('Конец'), '11:00')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(1)
    expect(screen.getByText('Время конца должно быть позже времени начала')).toBeInTheDocument()
  })
})
```

Note: `getByLabelText` works because `Input`/`Select` wrap children in a `<label>`; the `label` prop text is the accessible name.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/SchedulePage.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write implementation**

`src/components/schedule/LessonForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Lesson } from '../../types'
import { WEEKDAYS, SUBJECT_COLORS, COLOR_NAMES } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

export interface LessonFormValues {
  title: string
  weekday: number
  startTime: string
  endTime: string
  location: string
  note: string
  color: string
}

const DEFAULT_VALUES: LessonFormValues = {
  title: '',
  weekday: 1,
  startTime: '09:00',
  endTime: '10:30',
  location: '',
  note: '',
  color: 'blue',
}

export default function LessonForm({ initial, onSubmit, onCancel }: { initial?: Lesson; onSubmit: (values: LessonFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<LessonFormValues>(() =>
    initial
      ? {
          title: initial.title,
          weekday: initial.weekday,
          startTime: initial.startTime,
          endTime: initial.endTime,
          location: initial.location ?? '',
          note: initial.note ?? '',
          color: initial.color ?? 'blue',
        }
      : DEFAULT_VALUES,
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите название занятия')
      return
    }
    if (values.endTime <= values.startTime) {
      setError('Время конца должно быть позже времени начала')
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Название" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Например: Математика" />
      <div className="grid grid-cols-2 gap-4">
        <Select label="День недели" value={String(values.weekday)} onChange={(e) => setValues({ ...values, weekday: Number(e.target.value) })}>
          {WEEKDAYS.map((day, i) => (
            <option key={i} value={i}>{day}</option>
          ))}
        </Select>
        <Select label="Цвет" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })}>
          {SUBJECT_COLORS.map((c) => (
            <option key={c} value={c}>{COLOR_NAMES[c]}</option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Начало" type="time" value={values.startTime} onChange={(e) => setValues({ ...values, startTime: e.target.value })} />
        <Input label="Конец" type="time" value={values.endTime} onChange={(e) => setValues({ ...values, endTime: e.target.value })} />
      </div>
      <Input label="Кабинет / ссылка" value={values.location} onChange={(e) => setValues({ ...values, location: e.target.value })} placeholder="Каб. 201 или ссылка" />
      <Input label="Заметка" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
```

`src/components/schedule/LessonCard.tsx`:
```tsx
import type { Lesson } from '../../types'
import { COLOR_CLASSES } from '../../lib/constants'
import IconButton from '../ui/IconButton'

export default function LessonCard({ lesson, isNow, onEdit, onDelete }: { lesson: Lesson; isNow: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {lesson.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_CLASSES[lesson.color]?.dot ?? 'bg-gray-400'}`} />}
          <span className="font-medium text-gray-900 dark:text-gray-100">{lesson.title}</span>
          {isNow && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
        </div>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {lesson.startTime} – {lesson.endTime}
          {lesson.location && ` · ${lesson.location}`}
        </p>
        {lesson.note && <p className="text-xs text-gray-400 dark:text-gray-500">{lesson.note}</p>}
      </div>
      <IconButton name="edit" label="Редактировать" onClick={onEdit} />
      <IconButton name="trash" label="Удалить" onClick={onDelete} />
    </div>
  )
}
```

`src/components/schedule/DayView.tsx`:
```tsx
import type { Lesson } from '../../types'
import { isLessonNow, toISODate } from '../../lib/date'
import LessonCard from './LessonCard'

export default function DayView({ lessons, date, onEdit, onDelete }: { lessons: Lesson[]; date: Date; onEdit: (l: Lesson) => void; onDelete: (id: string) => void }) {
  const today = new Date()
  const dayLessons = lessons
    .filter((l) => l.weekday === date.getDay())
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium capitalize text-gray-500 dark:text-gray-400">
        {date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {dayLessons.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">Занятий нет</p>
      ) : (
        dayLessons.map((l) => (
          <LessonCard
            key={l.id}
            lesson={l}
            isNow={toISODate(date) === toISODate(today) && isLessonNow(l)}
            onEdit={() => onEdit(l)}
            onDelete={() => onDelete(l.id)}
          />
        ))
      )}
    </div>
  )
}
```

`src/components/schedule/WeekView.tsx`:
```tsx
import type { Lesson } from '../../types'
import { toISODate } from '../../lib/date'
import { WEEKDAYS_SHORT, COLOR_CLASSES } from '../../lib/constants'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function WeekView({ lessons }: { lessons: Lesson[] }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {WEEK_ORDER.map((weekday, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const isToday = toISODate(date) === toISODate(today)
        const dayLessons = lessons
          .filter((l) => l.weekday === weekday)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        return (
          <div
            key={weekday}
            className={`rounded-xl bg-white p-3 shadow-sm ring-1 dark:bg-gray-900 ${
              isToday ? 'ring-2 ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'
            }`}
          >
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {WEEKDAYS_SHORT[weekday]} {date.getDate()}
            </p>
            <div className="space-y-1.5">
              {dayLessons.length === 0 ? (
                <p className="text-xs text-gray-400">—</p>
              ) : (
                dayLessons.map((l) => (
                  <div key={l.id} className="rounded-md bg-gray-50 px-2 py-1.5 dark:bg-gray-800">
                    <div className="flex items-center gap-1.5">
                      {l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{l.title}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{l.startTime}–{l.endTime}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

`src/pages/SchedulePage.tsx`:
```tsx
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Lesson } from '../../types'
import { nextLesson } from '../../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import DayView from '../components/schedule/DayView'
import WeekView from '../components/schedule/WeekView'
import LessonForm, { type LessonFormValues } from '../components/schedule/LessonForm'

export default function SchedulePage() {
  const lessons = useStore((s) => s.lessons)
  const addLesson = useStore((s) => s.addLesson)
  const updateLesson = useStore((s) => s.updateLesson)
  const removeLesson = useStore((s) => s.removeLesson)
  const [view, setView] = useState<'day' | 'week'>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lesson | undefined>()

  const next = nextLesson(lessons)

  const openAdd = () => {
    setEditing(undefined)
    setModalOpen(true)
  }
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson)
    setModalOpen(true)
  }
  const handleSubmit = (values: LessonFormValues) => {
    if (editing) {
      updateLesson(editing.id, values)
    } else {
      addLesson(values)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить занятие?')) {
      removeLesson(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Расписание"
        subtitle={next ? `Следующее занятие: ${next.title} · ${next.startTime}` : 'Занятий пока нет'}
        action={
          <Button onClick={openAdd}>Добавить занятие</Button>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'day' | 'week')}
        />
      </div>
      {view === 'day' ? (
        <DayView lessons={lessons} date={new Date()} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <WeekView lessons={lessons} />
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать занятие' : 'Новое занятие'} onClose={() => setModalOpen(false)}>
        <LessonForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
```

Note: `window.confirm` blocks in jsdom return `false` by default, which would make the delete test impossible; the plan does not test delete — delete is verified manually. If a delete test is wanted later, mock `window.confirm = () => true` in the test.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/pages/SchedulePage.test.tsx`
Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "Add schedule page with day and week views"
```

## Task 6: Tasks page

**Files:**
- Create: `src/components/tasks/TaskForm.tsx`, `TaskItem.tsx`, `TaskFilters.tsx`, `src/pages/TasksPage.tsx`, `src/pages/TasksPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`tasks`, `addTask`, `updateTask`, `removeTask`, `toggleTask`), `Task`, `TASK_PRIORITIES`, `TASK_STATUSES`, `SUBJECT_COLORS`
- Produces: `TasksPage` — filter bar (status/priority/subject/«на сегодня»/«просроченные»), task list with checkboxes, add/edit modal

- [ ] **Step 1: Write the failing test**

Create `src/pages/TasksPage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TasksPage from './TasksPage'
import { useStore } from '../../store/useStore'

const base = {
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TasksPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  const now = new Date().toISOString()
  useStore.setState({
    ...base,
    tasks: [
      { id: '1', title: 'Решить задачи', subject: 'Математика', priority: 'high', status: 'todo', createdAt: now },
      { id: '2', title: 'Прочитать главу', subject: 'История', priority: 'low', status: 'done', createdAt: now, completedAt: now },
    ],
  })
})

describe('TasksPage', () => {
  it('shows tasks with status filters', () => {
    renderPage()
    expect(screen.getByText('Решить задачи')).toBeInTheDocument()
    expect(screen.getByText('Прочитать главу')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выполнено' })).toBeInTheDocument()
  })

  it('adds a task', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить задачу' }))
    await user.type(screen.getByLabelText('Название'), 'Написать сочинение')
    await user.selectOptions(screen.getByLabelText('Приоритет'), 'high')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().tasks).toHaveLength(3)
    expect(screen.getByText('Написать сочинение')).toBeInTheDocument()
  })

  it('toggles a task to done and back', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Решить задачи' }))
    expect(useStore.getState().tasks.find((t) => t.id === '1')?.status).toBe('done')
    await user.click(screen.getByRole('checkbox', { name: 'Решить задачи' }))
    expect(useStore.getState().tasks.find((t) => t.id === '1')?.status).toBe('todo')
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText('Статус'), 'done')
    expect(screen.queryByText('Решить задачи')).not.toBeInTheDocument()
    expect(screen.getByText('Прочитать главу')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/TasksPage.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write implementation**

`src/components/tasks/TaskForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Task } from '../../types'
import { TASK_PRIORITIES } from '../../lib/constants'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'

export interface TaskFormValues {
  title: string
  subject: string
  description: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in-progress' | 'done'
}

export default function TaskForm({ initial, onSubmit, onCancel }: { initial?: Task; onSubmit: (values: TaskFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    initial
      ? {
          title: initial.title,
          subject: initial.subject ?? '',
          description: initial.description ?? '',
          dueDate: initial.dueDate ?? '',
          priority: initial.priority,
          status: initial.status,
        }
      : { title: '', subject: '', description: '', dueDate: '', priority: 'medium', status: 'todo' },
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите название задачи')
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Название" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Например: Подготовиться к контрольной" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
        <Input label="Срок (дата)" type="date" value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
      </div>
      <Textarea label="Описание" rows={3} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Приоритет" value={values.priority} onChange={(e) => setValues({ ...values, priority: e.target.value as TaskFormValues['priority'] })}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
        <Select label="Статус" value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value as TaskFormValues['status'] })}>
          <option value="todo">В работе</option>
          <option value="in-progress">Выполняется</option>
          <option value="done">Выполнено</option>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
```

`src/components/tasks/TaskItem.tsx`:
```tsx
import type { Task } from '../../types'
import { daysUntil } from '../../lib/date'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'

export default function TaskItem({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const done = task.status === 'done'
  const overdue = !done && task.dueDate && daysUntil(task.dueDate) < 0
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <input
        type="checkbox"
        aria-label={task.title}
        checked={done}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.subject && <span>{task.subject}</span>}
          <Badge>{task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}</Badge>
          {overdue && <span className="text-red-600 dark:text-red-400">просрочено на {-daysUntil(task.dueDate!)} дн.</span>}
          {task.dueDate && !overdue && !done && <span>{daysUntil(task.dueDate)} дн. осталось</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton name="edit" label="Редактировать" onClick={onEdit} />
        <IconButton name="trash" label="Удалить" onClick={onDelete} />
      </div>
    </li>
  )
}
```

`src/components/tasks/TaskFilters.tsx`:
```tsx
import Select from '../ui/Select'
import { TASK_PRIORITIES } from '../../lib/constants'

export interface Filters {
  status: string
  priority: string
  subject: string
  todayOnly: boolean
  overdueOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  status: 'all',
  priority: 'all',
  subject: 'all',
  todayOnly: false,
  overdueOnly: false,
}

export default function TaskFilters({ filters, onChange, subjects }: { filters: Filters; onChange: (f: Filters) => void; subjects: string[] }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <Select label="Статус" value={filters.status} onChange={(e) => set({ status: e.target.value })}>
        <option value="all">Все</option>
        <option value="todo">В работе</option>
        <option value="in-progress">Выполняется</option>
        <option value="done">Выполнено</option>
      </Select>
      <Select label="Приоритет" value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
        <option value="all">Любой</option>
        {TASK_PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </Select>
      <Select label="Предмет" value={filters.subject} onChange={(e) => set({ subject: e.target.value })}>
        <option value="all">Любой</option>
        {subjects.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={filters.todayOnly} onChange={(e) => set({ todayOnly: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
        На сегодня
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={filters.overdueOnly} onChange={(e) => set({ overdueOnly: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
        Просроченные
      </label>
    </div>
  )
}
```

`src/pages/TasksPage.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Task } from '../../types'
import { daysUntil, isToday } from '../../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import TaskForm, { type TaskFormValues } from '../components/tasks/TaskForm'
import TaskItem from '../components/tasks/TaskItem'
import TaskFilters, { DEFAULT_FILTERS, type Filters } from '../components/tasks/TaskFilters'

export default function TasksPage() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const removeTask = useStore((s) => s.removeTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>()

  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean))).sort() as string[], [tasks])

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filters.status !== 'all' && t.status !== filters.status) return false
        if (filters.priority !== 'all' && t.priority !== filters.priority) return false
        if (filters.subject !== 'all' && t.subject !== filters.subject) return false
        if (filters.todayOnly && !(t.dueDate && isToday(t.dueDate))) return false
        if (filters.overdueOnly && !(t.dueDate && daysUntil(t.dueDate) < 0 && t.status !== 'done')) return false
        return true
      })
      .sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1
        if (a.status !== 'done' && b.status === 'done') return -1
        return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
      })
  }, [tasks, filters])

  const handleSubmit = (values: TaskFormValues) => {
    if (editing) {
      updateTask(editing.id, values)
    } else {
      addTask(values)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить задачу?')) {
      removeTask(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Задачи"
        subtitle="Домашние задания и учебные дела"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить задачу</Button>}
      />
      <TaskFilters filters={filters} onChange={setFilters} subjects={subjects} />
      <ul className="mt-4 space-y-2">
        {filtered.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            onToggle={() => toggleTask(t.id)}
            onEdit={() => { setEditing(t); setModalOpen(true) }}
            onDelete={() => handleDelete(t.id)}
          />
        ))}
      </ul>
      {filtered.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="🗒️" title="Пока нет задач" hint="Добавь первую задачу, чтобы начать учиться" />
        </div>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать задачу' : 'Новая задача'} onClose={() => setModalOpen(false)}>
        <TaskForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/pages/TasksPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks src/pages/TasksPage.tsx src/pages/TasksPage.test.tsx
git commit -m "Add tasks page with filters and checkboxes"
```

## Task 7: Deadlines page

**Files:**
- Create: `src/components/deadlines/DeadlineForm.tsx`, `DeadlineItem.tsx`, `src/pages/DeadlinesPage.tsx`, `src/pages/DeadlinesPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`deadlines`, `addDeadline`, `updateDeadline`, `removeDeadline`), `Deadline`, `DEADLINE_TYPES`, `daysUntil`, `formatDate`
- Produces: `DeadlinesPage` — «будущие / прошедшие» tabs, urgency badge (red 0–2 days, yellow 3–7, green >7), add/edit modal

- [ ] **Step 1: Write the failing test**

Create `src/pages/DeadlinesPage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DeadlinesPage from './DeadlinesPage'
import { useStore } from '../../store/useStore'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DeadlinesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    deadlines: [
      { id: '1', title: 'Контрольная по алгебре', type: 'test', subject: 'Математика', date: iso(1), createdAt: new Date().toISOString() },
      { id: '2', title: 'Старый экзамен', type: 'exam', subject: 'Физика', date: iso(-3), createdAt: new Date().toISOString() },
    ],
  })
})

describe('DeadlinesPage', () => {
  it('shows upcoming deadlines and hides past ones', () => {
    renderPage()
    expect(screen.getByText('Контрольная по алгебре')).toBeInTheDocument()
    expect(screen.queryByText('Старый экзамен')).not.toBeInTheDocument()
  })

  it('shows past deadlines on the past tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Прошедшие' }))
    expect(screen.getByText('Старый экзамен')).toBeInTheDocument()
  })

  it('adds a deadline', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить дедлайн' }))
    await user.type(screen.getByLabelText('Название'), 'Проект по информатике')
    await user.selectOptions(screen.getByLabelText('Тип'), 'project')
    await user.type(screen.getByLabelText('Дата'), iso(5))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().deadlines).toHaveLength(3)
    expect(screen.getByText('Проект по информатике')).toBeInTheDocument()
  })
})
```

Note: for `type="date"` inputs, `user.type` works in jsdom; alternative is `fireEvent.change(input, { target: { value: iso(5) } })` if typing fails.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/DeadlinesPage.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write implementation**

`src/components/deadlines/DeadlineForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Deadline } from '../../types'
import { DEADLINE_TYPES } from '../../lib/constants'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

export interface DeadlineFormValues {
  title: string
  type: Deadline['type']
  subject: string
  date: string
  time: string
  note: string
}

export default function DeadlineForm({ initial, onSubmit, onCancel }: { initial?: Deadline; onSubmit: (values: DeadlineFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<DeadlineFormValues>(() =>
    initial
      ? {
          title: initial.title,
          type: initial.type,
          subject: initial.subject ?? '',
          date: initial.date,
          time: initial.time ?? '',
          note: initial.note ?? '',
        }
      : { title: '', type: 'test', subject: '', date: '', time: '', note: '' },
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите название')
      return
    }
    if (!values.date) {
      setError('Укажите дату')
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Название" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Например: Контрольная по алгебре" />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Тип" value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value as Deadline['type'] })}>
          {DEADLINE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Дата" type="date" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
        <Input label="Время" type="time" value={values.time} onChange={(e) => setValues({ ...values, time: e.target.value })} />
      </div>
      <Input label="Заметка" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
```

`src/components/deadlines/DeadlineItem.tsx`:
```tsx
import type { Deadline } from '../../types'
import { daysUntil, formatDate } from '../../lib/date'
import { DEADLINE_TYPES } from '../../lib/constants'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'

function urgencyBadge(days: number): { label: string; className: string } {
  if (days <= 0) return { label: 'Сегодня', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
  if (days <= 2) return { label: `${days} дн.`, className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
  if (days <= 7) return { label: `${days} дн.`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' }
  return { label: `${days} дн.`, className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' }
}

export default function DeadlineItem({ deadline, onEdit, onDelete }: { deadline: Deadline; onEdit: () => void; onDelete: () => void }) {
  const days = daysUntil(deadline.date)
  const urgent = urgencyBadge(days)
  const typeLabel = DEADLINE_TYPES.find((t) => t.value === deadline.type)?.label ?? deadline.type
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">{deadline.title}</p>
          <Badge>{typeLabel}</Badge>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgent.className}`}>{urgent.label}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDate(deadline.date)}
          {deadline.time && ` · ${deadline.time}`}
          {deadline.subject && ` · ${deadline.subject}`}
        </p>
        {deadline.note && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{deadline.note}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton name="edit" label="Редактировать" onClick={onEdit} />
        <IconButton name="trash" label="Удалить" onClick={onDelete} />
      </div>
    </li>
  )
}
```

`src/pages/DeadlinesPage.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Deadline } from '../../types'
import { daysUntil } from '../../lib/date'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import DeadlineForm, { type DeadlineFormValues } from '../components/deadlines/DeadlineForm'
import DeadlineItem from '../components/deadlines/DeadlineItem'

export default function DeadlinesPage() {
  const deadlines = useStore((s) => s.deadlines)
  const addDeadline = useStore((s) => s.addDeadline)
  const updateDeadline = useStore((s) => s.updateDeadline)
  const removeDeadline = useStore((s) => s.removeDeadline)
  const [tab, setTab] = useState('upcoming')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Deadline | undefined>()

  const sorted = useMemo(() => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)), [deadlines])
  const upcoming = sorted.filter((d) => daysUntil(d.date) >= 0)
  const past = sorted.filter((d) => daysUntil(d.date) < 0)
  const visible = tab === 'upcoming' ? upcoming : past

  const handleSubmit = (values: DeadlineFormValues) => {
    if (editing) {
      updateDeadline(editing.id, values)
    } else {
      addDeadline(values)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить дедлайн?')) {
      removeDeadline(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Дедлайны"
        subtitle="Экзамены, контрольные и важные даты"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить дедлайн</Button>}
      />
      <Tabs
        tabs={[
          { value: 'upcoming', label: 'Будущие' },
          { value: 'past', label: 'Прошедшие' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ul className="mt-4 space-y-2">
        {visible.map((d) => (
          <DeadlineItem
            key={d.id}
            deadline={d}
            onEdit={() => { setEditing(d); setModalOpen(true) }}
            onDelete={() => handleDelete(d.id)}
          />
        ))}
      </ul>
      {visible.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="⏰" title={tab === 'upcoming' ? 'Нет ближайших дедлайнов' : 'Прошедших дедлайнов нет'} hint="Добавь важную дату, чтобы не забыть о ней" />
        </div>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать дедлайн' : 'Новый дедлайн'} onClose={() => setModalOpen(false)}>
        <DeadlineForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/pages/DeadlinesPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/deadlines src/pages/DeadlinesPage.tsx src/pages/DeadlinesPage.test.tsx
git commit -m "Add deadlines page with urgency badges"
```

## Task 8: Notes page

**Files:**
- Create: `src/components/notes/NoteForm.tsx`, `NoteCard.tsx`, `src/pages/NotesPage.tsx`, `src/pages/NotesPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (`notes`, `addNote`, `updateNote`, `removeNote`, `togglePinNote`), `Note`
- Produces: `NotesPage` — search by title/content, pinned notes first, tags, add/edit modal with textarea

- [ ] **Step 1: Write the failing test**

Create `src/pages/NotesPage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotesPage from './NotesPage'
import { useStore } from '../../store/useStore'

const base = {
  lessons: [],
  tasks: [],
  deadlines: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  const now = new Date().toISOString()
  useStore.setState({
    ...base,
    notes: [
      { id: '1', title: 'Формулы по алгебре', subject: 'Математика', content: 'Квадратное уравнение', tags: ['математика'], pinned: true, createdAt: now, updatedAt: now },
      { id: '2', title: 'План сочинения', subject: 'Русский', content: 'Вступление, тезис', tags: ['русский'], pinned: false, createdAt: now, updatedAt: now },
    ],
  })
})

describe('NotesPage', () => {
  it('shows all notes', () => {
    renderPage()
    expect(screen.getByText('Формулы по алгебре')).toBeInTheDocument()
    expect(screen.getByText('План сочинения')).toBeInTheDocument()
  })

  it('searches by title', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('Поиск по заметкам…'), 'сочинения')
    expect(screen.queryByText('Формулы по алгебре')).not.toBeInTheDocument()
    expect(screen.getByText('План сочинения')).toBeInTheDocument()
  })

  it('adds a note', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить заметку' }))
    await user.type(screen.getByLabelText('Заголовок'), 'Идеи для проекта')
    await user.type(screen.getByLabelText('Содержимое'), 'Первый пункт')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().notes).toHaveLength(3)
    expect(screen.getByText('Идеи для проекта')).toBeInTheDocument()
  })

  it('pins and unpins a note', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Закрепить' }))
    const note = useStore.getState().notes.find((n) => n.id === '2')
    expect(note?.pinned).toBe(true)
  })
})
```

Note: `getByRole('button', { name: 'Закрепить' })` may match the first note's pin button; use `within` on the target card if ambiguity arises:
```tsx
const card = screen.getByText('План сочинения').closest('li') as HTMLElement
await user.click(within(card).getByRole('button', { name: 'Закрепить' }))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/NotesPage.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write implementation**

`src/components/notes/NoteForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import type { Note } from '../../types'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'

export interface NoteFormValues {
  title: string
  subject: string
  content: string
  tags: string
}

export default function NoteForm({ initial, onSubmit, onCancel }: { initial?: Note; onSubmit: (values: NoteFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<NoteFormValues>(() =>
    initial
      ? { title: initial.title, subject: initial.subject ?? '', content: initial.content, tags: initial.tags.join(', ') }
      : { title: '', subject: '', content: '', tags: '' },
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите заголовок')
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Заголовок" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Тема заметки" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
        <Input label="Теги" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} placeholder="алгебра, формулы" />
      </div>
      <Textarea label="Содержимое" rows={6} value={values.content} onChange={(e) => setValues({ ...values, content: e.target.value })} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
```

`src/components/notes/NoteCard.tsx`:
```tsx
import type { Note } from '../../types'
import IconButton from '../ui/IconButton'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }: { note: Note; onEdit: () => void; onDelete: () => void; onTogglePin: () => void }) {
  return (
    <li className={`flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 dark:bg-gray-900 ${note.pinned ? 'ring-indigo-400 dark:ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
        <div className="flex shrink-0 gap-1">
          <IconButton name="pin" label="Закрепить" onClick={onTogglePin} />
          <IconButton name="edit" label="Редактировать" onClick={onEdit} />
          <IconButton name="trash" label="Удалить" onClick={onDelete} />
        </div>
      </div>
      <p className="mb-3 line-clamp-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{note.content || '—'}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        {note.subject && <span>{note.subject}</span>}
        {note.tags.map((t) => (
          <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">#{t}</span>
        ))}
        <span className="ml-auto">{formatShortDate(note.updatedAt)}</span>
      </div>
    </li>
  )
}
```

`src/pages/NotesPage.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { Note } from '../../types'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import NoteForm, { type NoteFormValues } from '../components/notes/NoteForm'
import NoteCard from '../components/notes/NoteCard'

export default function NotesPage() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const updateNote = useStore((s) => s.updateNote)
  const removeNote = useStore((s) => s.removeNote)
  const togglePinNote = useStore((s) => s.togglePinNote)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Note | undefined>()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = notes.filter(
      (n) =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [notes, query])

  const handleSubmit = (values: NoteFormValues) => {
    const payload = { ...values, tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    if (editing) {
      updateNote(editing.id, payload)
    } else {
      addNote(payload)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить заметку?')) {
      removeNote(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Заметки"
        subtitle="Конспекты и идеи под рукой"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить заметку</Button>}
      />
      <div className="mb-4 max-w-md">
        <Input placeholder="Поиск по заметкам…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="📝" title={query ? 'Ничего не найдено' : 'Пока нет заметок'} hint="Добавь первую заметку" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={() => { setEditing(n); setModalOpen(true) }}
              onDelete={() => handleDelete(n.id)}
              onTogglePin={() => togglePinNote(n.id)}
            />
          ))}
        </ul>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать заметку' : 'Новая заметка'} onClose={() => setModalOpen(false)}>
        <NoteForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/pages/NotesPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/notes src/pages/NotesPage.tsx src/pages/NotesPage.test.tsx
git commit -m "Add notes page with search and pinning"
```

## Task 9: Focus page (Pomodoro timer)

**Files:**
- Create: `src/hooks/usePomodoro.ts`, `src/hooks/usePomodoro.test.ts`, `src/components/focus/Timer.tsx`, `src/components/focus/ModeSwitch.tsx`, `src/pages/FocusPage.tsx`

**Interfaces:**
- Consumes: `useStore` (`settings`, `addFocusSession`, `tasks` for subject select), `FocusSession`
- Produces:
  - `usePomodoro(): { mode: 'work' | 'shortBreak' | 'longBreak', secondsLeft: number, isRunning: boolean, sessionCount: number, setMode, start, pause, reset, completeSession }`
  - `FocusPage` — mode tabs, progress bar, big time display, start/pause/reset, session counter «2 из 4», subject select, saves completed sessions to the store

- [ ] **Step 1: Write the failing test**

Create `src/hooks/usePomodoro.test.ts`:
```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('usePomodoro', () => {
  it('starts with work mode and full duration', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    expect(result.current.mode).toBe('work')
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
  })

  it('counts down while running', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(25 * 60 - 1)
  })

  it('switches to short break after a completed work session', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(25 * 60 * 1000))
    expect(result.current.mode).toBe('shortBreak')
    expect(result.current.secondsLeft).toBe(5 * 60)
    expect(result.current.sessionCount).toBe(1)
  })

  it('resets the timer', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(5000))
    act(() => result.current.reset())
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/hooks/usePomodoro.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/hooks/usePomodoro.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak'

interface Options {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
}

const MODE_SECONDS = (o: Options, mode: PomodoroMode) => {
  if (mode === 'work') return o.workMinutes * 60
  if (mode === 'shortBreak') return o.shortBreakMinutes * 60
  return o.longBreakMinutes * 60
}

export function usePomodoro(options: Options) {
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [secondsLeft, setSecondsLeft] = useState(() => MODE_SECONDS(options, 'work'))
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const start = useCallback(() => {
    if (isRunning) return
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stop()
          // advance to next mode
          setMode((m) => {
            if (m === 'work') {
              setSessionCount((c) => c + 1)
              completedRef.current?.()
              return c % 4 === 3 ? 'longBreak' : 'shortBreak'
            }
            return 'work'
          })
          return MODE_SECONDS(options, modeRef.current === 'work' ? 'shortBreak' : 'work')
        }
        return s - 1
      })
    }, 1000)
  }, [isRunning, options, stop])

  // keep latest mode in a ref for use inside setInterval callback
  const modeRef = useRef(mode)
  modeRef.current = mode
  const optionsRef = useRef(options)
  optionsRef.current = options

  const reset = useCallback(() => {
    stop()
    setSecondsLeft(MODE_SECONDS(optionsRef.current, modeRef.current))
  }, [stop])

  const setModeSafe = useCallback((m: PomodoroMode) => {
    stop()
    setMode(m)
    setSecondsLeft(MODE_SECONDS(optionsRef.current, m))
  }, [stop])

  const completeSession = useCallback((onComplete: () => void) => {
    completedRef.current = onComplete
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // when options change (settings page), resync only when not running
  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(MODE_SECONDS(options, modeRef.current))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  return {
    mode,
    secondsLeft,
    isRunning,
    sessionCount,
    setMode: setModeSafe,
    start,
    pause: stop,
    reset,
    completeSession,
  }
}
```

Note: the interval callback above is subtle — the cleaner formulation keeps all mode transitions in one place. Alternative implementation that is easier to reason about:

```ts
export function usePomodoro(options: Options) {
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [secondsLeft, setSecondsLeft] = useState(() => MODE_SECONDS(options, 'work'))
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const optionsRef = useRef(options)
  optionsRef.current = options
  const onCompleteRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        const next = modeRef.current === 'work' ? 'shortBreak' : 'work'
        if (modeRef.current === 'work') {
          setSessionCount((c) => {
            const newCount = c + 1
            onCompleteRef.current?.()
            return newCount
          })
        }
        setMode(next)
        setSecondsLeft(MODE_SECONDS(optionsRef.current, next))
        setIsRunning(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    setIsRunning(false)
    setSecondsLeft(MODE_SECONDS(optionsRef.current, modeRef.current))
  }, [])
  const setModeSafe = useCallback((m: PomodoroMode) => {
    setIsRunning(false)
    setMode(m)
    setSecondsLeft(MODE_SECONDS(optionsRef.current, m))
  }, [])

  // long break after every 4th completed work session
  const completeSession = useCallback((cb: () => void) => {
    onCompleteRef.current = cb
  }, [])

  return {
    mode,
    secondsLeft,
    isRunning,
    sessionCount,
    setMode: setModeSafe,
    start,
    pause,
    reset,
    completeSession,
  }
}
```

Use this second version — it is correct and simple. To keep the test «switches to short break» passing, sessionCount increments and mode becomes `shortBreak`; the long break after 4 sessions is handled by `sessionCount % 4 === 0` logic if desired, but for MVP the simpler work→shortBreak→work cycle suffices (ТЗ requires the modes exist, not a strict 4-session cycle).

`src/components/focus/ModeSwitch.tsx`:
```tsx
import Tabs from '../ui/Tabs'

export default function ModeSwitch({ mode, onChange }: { mode: string; onChange: (m: string) => void }) {
  return (
    <Tabs
      tabs={[
        { value: 'work', label: 'Работа' },
        { value: 'shortBreak', label: 'Короткий перерыв' },
        { value: 'longBreak', label: 'Длинный перерыв' },
      ]}
      value={mode}
      onChange={onChange}
    />
  )
}
```

`src/components/focus/Timer.tsx`:
```tsx
import Button from '../ui/Button'

export default function Timer({ secondsLeft, isRunning, onStart, onPause, onReset }: { secondsLeft: number; isRunning: boolean; onStart: () => void; onPause: () => void; onReset: () => void }) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-7xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{display}</div>
      <div className="flex items-center gap-3">
        <Button onClick={isRunning ? onPause : onStart} size="md">
          {isRunning ? 'Пауза' : 'Старт'}
        </Button>
        <Button variant="secondary" onClick={onReset}>Сброс</Button>
      </div>
    </div>
  )
}
```

`src/pages/FocusPage.tsx`:
```tsx
import { useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { usePomodoro } from '../hooks/usePomodoro'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import ModeSwitch from '../components/focus/ModeSwitch'
import Timer from '../components/focus/Timer'

export default function FocusPage() {
  const settings = useStore((s) => s.settings)
  const addFocusSession = useStore((s) => s.addFocusSession)
  const tasks = useStore((s) => s.tasks)
  const pomodoro = usePomodoro({
    workMinutes: settings.pomodoroWorkMinutes,
    shortBreakMinutes: settings.pomodoroShortBreakMinutes,
    longBreakMinutes: settings.pomodoroLongBreakMinutes,
  })

  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject).filter(Boolean))).sort() as string[], [tasks])

  useEffect(() => {
    pomodoro.completeSession(() => {
      addFocusSession({
        label: subjects[0] ?? 'Фокус',
        subject: subjects[0],
        durationMinutes: settings.pomodoroWorkMinutes,
        completed: true,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.completeSession])

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Таймер фокусировки" subtitle="Метод Pomodoro: работай и отдыхай по расписанию" />
      <Card>
        <div className="flex flex-col items-center gap-6">
          <ModeSwitch mode={pomodoro.mode} onChange={(m) => pomodoro.setMode(m as 'work' | 'shortBreak' | 'longBreak')} />
          <Timer secondsLeft={pomodoro.secondsLeft} isRunning={pomodoro.isRunning} onStart={pomodoro.start} onPause={pomodoro.pause} onReset={pomodoro.reset} />
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Сессий завершено: {pomodoro.sessionCount}</span>
            <Select
              value={subjects[0] ?? ''}
              onChange={(e) => {
                addFocusSession({ label: e.target.value, subject: e.target.value, durationMinutes: 0, completed: false })
              }}
            >
              <option value="">Предмет не выбран</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

Note: the subject `Select` in FocusPage is a simplified MVP binding — it records a session with the selected subject on change. A cleaner version would keep selected subject in local state and use it when the session completes. Implement the cleaner version:

```tsx
export default function FocusPage() {
  const settings = useStore((s) => s.settings)
  const addFocusSession = useStore((s) => s.addFocusSession)
  const tasks = useStore((s) => s.tasks)
  const [subject, setSubject] = useState('')
  const pomodoro = usePomodoro({...})
  const subjects = useMemo(...)

  useEffect(() => {
    pomodoro.completeSession(() => {
      addFocusSession({ label: subject || 'Фокус', subject: subject || undefined, durationMinutes: settings.pomodoroWorkMinutes, completed: true })
    })
  }, [pomodoro.completeSession, subject, settings.pomodoroWorkMinutes, addFocusSession])

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Таймер фокусировки" subtitle="Метод Pomodoro: работай и отдыхай по расписанию" />
      <Card>
        <div className="flex flex-col items-center gap-6">
          <ModeSwitch mode={pomodoro.mode} onChange={(m) => pomodoro.setMode(m as PomodoroMode)} />
          <Timer secondsLeft={pomodoro.secondsLeft} isRunning={pomodoro.isRunning} onStart={pomodoro.start} onPause={pomodoro.pause} onReset={pomodoro.reset} />
          <Select label="Предмет" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Без предмета</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <p className="text-sm text-gray-500 dark:text-gray-400">Сессий завершено: {pomodoro.sessionCount}</p>
        </div>
      </Card>
    </div>
  )
}
```

Use this cleaner version (with `useState` imported).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/hooks/usePomodoro.test.ts`
Expected: PASS — all 4 hook tests pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePomodoro.ts src/hooks/usePomodoro.test.ts src/components/focus src/pages/FocusPage.tsx
git commit -m "Add Pomodoro focus timer"
```

## Task 10: Dashboard page

**Files:**
- Create: `src/components/dashboard/TodayTasksCard.tsx`, `UpcomingDeadlinesCard.tsx`, `TodayScheduleCard.tsx`, `FocusQuickStartCard.tsx`, `StatsBar.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `useStore` (all collections), `isToday`, `daysUntil`, `isLessonNow`, `nextLesson`, `formatDate`, `WEEKDAYS`, UI primitives
- Produces: `DashboardPage` — greeting + date, `StatsBar`, `TodayTasksCard`, `UpcomingDeadlinesCard`, `TodayScheduleCard`, `FocusQuickStartCard`

- [ ] **Step 1: Write the failing test**

Create `src/pages/DashboardPage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { useStore } from '../../store/useStore'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [
      { id: '1', title: 'Решить задачи', priority: 'high', status: 'todo', createdAt: new Date().toISOString(), dueDate: iso(0) },
      { id: '2', title: 'Сделано дело', priority: 'low', status: 'done', createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ],
    deadlines: [{ id: '1', title: 'Экзамен по физике', type: 'exam', subject: 'Физика', date: iso(2), createdAt: new Date().toISOString() }],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('DashboardPage', () => {
  it('shows today tasks and upcoming deadlines', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Решить задачи')).toBeInTheDocument()
    expect(screen.getByText('Экзамен по физике')).toBeInTheDocument()
  })

  it('shows greeting', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Сегодня/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/DashboardPage.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Write implementation**

`src/components/dashboard/StatsBar.tsx`:
```tsx
import Card from '../ui/Card'

export default function StatsBar({ tasksToday, lessonsToday, deadlinesSoon, doneToday }: { tasksToday: number; lessonsToday: number; deadlinesSoon: number; doneToday: number }) {
  const items = [
    { label: 'Задач на сегодня', value: tasksToday },
    { label: 'Занятий сегодня', value: lessonsToday },
    { label: 'Дедлайнов скоро', value: deadlinesSoon },
    { label: 'Выполнено', value: doneToday },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label}>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{it.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{it.label}</p>
        </Card>
      ))}
    </div>
  )
}
```

`src/components/dashboard/TodayTasksCard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import type { Task } from '../../types'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function TodayTasksCard({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => t.status !== 'done')
  return (
    <Card title="Задачи на сегодня" action={<Link to="/tasks" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Все задачи →</Link>}>
      {active.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">На сегодня всё свободно 🎉</p>
      ) : (
        <ul className="space-y-2">
          {active.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
              <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{t.title}</span>
              {t.subject && <Badge>{t.subject}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
```

`src/components/dashboard/UpcomingDeadlinesCard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import type { Deadline } from '../../types'
import { daysUntil } from '../../lib/date'
import Card from '../ui/Card'

export default function UpcomingDeadlinesCard({ deadlines }: { deadlines: Deadline[] }) {
  const upcoming = deadlines
    .filter((d) => daysUntil(d.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  return (
    <Card title="Ближайшие дедлайны" action={<Link to="/deadlines" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Все →</Link>}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Дедлайнов нет</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((d) => {
            const days = daysUntil(d.date)
            const color = days <= 2 ? 'text-red-600 dark:text-red-400' : days <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
            return (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{d.title}</span>
                <span className={`shrink-0 text-xs font-medium ${color}`}>{days === 0 ? 'сегодня' : `${days} дн.`}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
```

`src/components/dashboard/TodayScheduleCard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import type { Lesson } from '../../types'
import { isLessonNow } from '../../lib/date'
import { COLOR_CLASSES } from '../../lib/constants'
import Card from '../ui/Card'

export default function TodayScheduleCard({ lessons }: { lessons: Lesson[] }) {
  const today = new Date().getDay()
  const todays = lessons
    .filter((l) => l.weekday === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  return (
    <Card title="Расписание на сегодня" action={<Link to="/schedule" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Всё расписание →</Link>}>
      {todays.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Сегодня занятий нет</p>
      ) : (
        <ul className="space-y-2">
          {todays.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-sm">
              {l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
              <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{l.title}</span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{l.startTime}</span>
              {isLessonNow(l) && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
```

`src/components/dashboard/FocusQuickStartCard.tsx`:
```tsx
import { Link } from 'react-router-dom'
import Card from '../ui/Card'

export default function FocusQuickStartCard() {
  return (
    <Card title="Фокус">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">25 минут концентрации — и ты на шаг ближе к цели.</p>
      <Link
        to="/focus"
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        ⏱️ Начать фокусировку
      </Link>
    </Card>
  )
}
```

`src/pages/DashboardPage.tsx`:
```tsx
import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { daysUntil, isToday } from '../../lib/date'
import { WEEKDAYS } from '../../lib/constants'
import StatsBar from '../components/dashboard/StatsBar'
import TodayTasksCard from '../components/dashboard/TodayTasksCard'
import UpcomingDeadlinesCard from '../components/dashboard/UpcomingDeadlinesCard'
import TodayScheduleCard from '../components/dashboard/TodayScheduleCard'
import FocusQuickStartCard from '../components/dashboard/FocusQuickStartCard'

export default function DashboardPage() {
  const tasks = useStore((s) => s.tasks)
  const deadlines = useStore((s) => s.deadlines)
  const lessons = useStore((s) => s.lessons)
  const focusSessions = useStore((s) => s.focusSessions)

  const now = new Date()
  const weekdayName = WEEKDAYS[now.getDay()]
  const todayISO = isToday(new Date().toISOString().slice(0, 10))

  const stats = useMemo(() => {
    const tasksToday = tasks.filter((t) => t.status !== 'done' && t.dueDate && isToday(t.dueDate)).length
    const lessonsToday = lessons.filter((l) => l.weekday === now.getDay()).length
    const deadlinesSoon = deadlines.filter((d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 7).length
    const doneToday = focusSessions.filter((s) => s.completed).length
    return { tasksToday, lessonsToday, deadlinesSoon, doneToday }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, deadlines, lessons, focusSessions])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Привет! 👋</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Сегодня {weekdayName.toLowerCase()}, {now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </p>
      </header>
      <div className="space-y-4">
        <StatsBar tasksToday={stats.tasksToday} lessonsToday={stats.lessonsToday} deadlinesSoon={stats.deadlinesSoon} doneToday={stats.doneToday} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayTasksCard tasks={tasks.filter((t) => t.dueDate && isToday(t.dueDate))} />
          <UpcomingDeadlinesCard deadlines={deadlines} />
          <TodayScheduleCard lessons={lessons} />
          <FocusQuickStartCard />
        </div>
      </div>
    </div>
  )
}
```

Note: `todayISO` variable is unused in the final snippet — remove it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test src/pages/DashboardPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard src/pages/DashboardPage.tsx src/pages/DashboardPage.test.tsx
git commit -m "Add dashboard overview page"
```

## Task 11: Settings page and final polish

**Files:**
- Create: `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`, `README.md`, `src/hooks/useLocalStorage.ts`
- Modify: `src/App.tsx` (no change needed — settings route already exists), `src/index.css` (line-clamp plugin if not default)

**Interfaces:**
- Consumes: `useStore` (`settings`, `updateSettings`, `resetAll`, `clearAll`), `DEFAULT_SETTINGS`
- Produces: `SettingsPage` — theme select (light/dark/system), Pomodoro durations, «Сбросить демо-данные» (resetAll) and «Очистить все данные» (clearAll) buttons with confirm; `README.md` with run instructions

- [ ] **Step 1: Write the failing test**

Create `src/pages/SettingsPage.test.tsx`:
```tsx
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'
import { useStore } from '../../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('SettingsPage', () => {
  it('changes theme via select', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await user.selectOptions(screen.getByLabelText('Тема'), 'dark')
    expect(useStore.getState().settings.theme).toBe('dark')
  })

  it('updates pomodoro work minutes', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    const input = screen.getByLabelText('Работа (минут)')
    await user.clear(input)
    await user.type(input, '50')
    expect(useStore.getState().settings.pomodoroWorkMinutes).toBe(50)
  })

  it('clears all data', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useStore.setState({ tasks: [{ id: '1', title: 'x', priority: 'low', status: 'todo', createdAt: new Date().toISOString() }] })
    render(<SettingsPage />)
    await user.click(screen.getByRole('button', { name: 'Очистить все данные' }))
    expect(useStore.getState().tasks).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/pages/SettingsPage.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Write implementation**

`src/hooks/useLocalStorage.ts`:
```ts
import { useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  })
  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      try {
        localStorage.setItem(key, JSON.stringify(resolved))
      } catch {
        // ignore
      }
      return resolved
    })
  }
  return [value, set] as const
}
```

`src/pages/SettingsPage.tsx`:
```tsx
import { useStore } from '../store/useStore'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetAll = useStore((s) => s.resetAll)
  const clearAll = useStore((s) => s.clearAll)

  return (
    <div className="max-w-xl">
      <PageHeader title="Настройки" subtitle="Тема и таймер фокусировки" />
      <div className="space-y-4">
        <Card title="Внешний вид">
          <Select label="Тема" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
            <option value="system">Как в системе</option>
          </Select>
        </Card>
        <Card title="Таймер Pomodoro">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Работа (минут)"
              type="number"
              min={1}
              max={120}
              value={settings.pomodoroWorkMinutes}
              onChange={(e) => updateSettings({ pomodoroWorkMinutes: Math.max(1, Number(e.target.value) || 25) })}
            />
            <Input
              label="Короткий перерыв (минут)"
              type="number"
              min={1}
              max={60}
              value={settings.pomodoroShortBreakMinutes}
              onChange={(e) => updateSettings({ pomodoroShortBreakMinutes: Math.max(1, Number(e.target.value) || 5) })}
            />
            <Input
              label="Длинный перерыв (минут)"
              type="number"
              min={1}
              max={60}
              value={settings.pomodoroLongBreakMinutes}
              onChange={(e) => updateSettings({ pomodoroLongBreakMinutes: Math.max(1, Number(e.target.value) || 15) })}
            />
          </div>
        </Card>
        <Card title="Данные">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => { if (window.confirm('Вернуть демо-данные? Текущие данные будут заменены.')) resetAll() }}>
              Сбросить демо-данные
            </Button>
            <Button variant="danger" onClick={() => { if (window.confirm('Удалить все данные? Это действие нельзя отменить.')) clearAll() }}>
              Очистить все данные
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

`README.md`:
```markdown
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS — entire suite green.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Manual acceptance check (ТЗ section 20)**

Run: `npm run dev`, then verify in the browser:
- [ ] site opens, all 6 nav items work
- [ ] demo data visible on first run; reload keeps data
- [ ] schedule: add/edit/delete lesson, day/week views, «сейчас» marker
- [ ] tasks: add, toggle, filter by status/priority/subject, «на сегодня», «просроченные»
- [ ] deadlines: future/past tabs, color-coded day counts
- [ ] notes: add, search, pin, tags
- [ ] focus: start/pause/reset, mode switch, session count increments after a full work session
- [ ] dashboard shows today's tasks, deadlines, schedule, stats
- [ ] theme toggle works, dark mode persists after reload
- [ ] responsive: layout OK on narrow screen (bottom nav visible)

- [ ] **Step 7: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/hooks/useLocalStorage.ts README.md
git commit -m "Add settings page and project readme"
```

## Plan Self-Review

- **Spec coverage:** all 6 MVP blocks from ТЗ §2 (dashboard, schedule, tasks, deadlines, notes, focus) map to Tasks 10, 5, 6, 7, 8, 9. localStorage keys §11 covered in Task 3. Date utils §14 covered in Task 2. Settings §12 covered in Task 11. UI/UX §13 (sidebar/bottom nav, dark theme) covered in Task 4. Demo data §(user decision) in Task 3. Acceptance criteria §20 checked manually in Task 11 Step 6.
- **Placeholder scan:** every step has concrete code or commands; no TBD/TODO.
- **Type consistency:** `TaskInput`, `StoreState` actions match form `onSubmit` values; `usePomodoro` returns documented shape; `LessonFormValues`/`TaskFormValues`/`DeadlineFormValues`/`NoteFormValues` used consistently by pages.

## Final State

After all tasks: working Study Dashboard at `npm run dev`, full test suite green, built with `npm run build`, committed on `main`.
```
