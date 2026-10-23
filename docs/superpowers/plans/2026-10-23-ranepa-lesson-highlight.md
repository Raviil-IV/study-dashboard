# Выделение импортированных занятий РАНХиГС — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Импортированные из РАНХиГС занятия отображаются полностью закрашенными полупрозрачными плашками (`#00382B` для СДО, `#3D0E69` для кабинета, нейтральный тон для остальных) вместо светлой карточки с точкой.

**Architecture:** Один модуль `src/lib/lessonStyle.ts` — единственный источник палитры. Он определяет импортированное занятие по `sourceUrl` и возвращает набор Tailwind-классов. Четыре компонента применяют результат; вёрстка, размеры и ручные занятия не меняются.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS 4 (arbitrary values + `dark:` вариант на классе `.dark`), Vitest + Testing Library.

## Global Constraints

- Бэкенд, схема БД, миграции, автосинк и форма занятия не меняются.
- Признак импорта — непустой `sourceUrl`.
- Оттенок берётся из `lesson.color`: `blue` → СДО, `green` → кабинет, иначе нейтральный.
- Ручные занятия сохраняют текущий вид (светлый фон + цветная точка `COLOR_CLASSES[color].dot`).
- Точка у импортированных занятий не рисуется; бейдж «сейчас» сохраняется.
- Базовый зелёный прогон до начала работ: 45 файлов / 263 теста, `npx tsc -b` без ошибок.

---

### Task 1: Модуль стилей и его юнит-тест

**Files:**
- Create: `src/lib/lessonStyle.ts`
- Test: `src/lib/lessonStyle.test.ts`

**Interfaces:**
- Consumes: `Lesson` из `src/types` (поля `sourceUrl?: string`, `color?: string`).
- Produces: `importedLessonClasses(lesson: Pick<Lesson, 'sourceUrl' | 'color'>): ImportedLessonClasses | null`, где `ImportedLessonClasses = { surface: string; surfaceStatic: string; title: string; meta: string }`.

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/lessonStyle.test.ts
import { describe, expect, it } from 'vitest'
import { importedLessonClasses } from './lessonStyle'

const SOURCE = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'

describe('importedLessonClasses', () => {
  it('returns null for a manually created lesson', () => {
    expect(importedLessonClasses({ color: 'blue' })).toBeNull()
  })

  it('uses the sand tone for СДО lessons', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE, color: 'blue' })
    expect(style?.surface).toContain('bg-[#00382B]/30')
    expect(style?.title).toContain('text-[#00382B]')
  })

  it('uses the thistle tone for lessons with a room number', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE, color: 'green' })
    expect(style?.surface).toContain('bg-[#3D0E69]/30')
    expect(style?.title).toContain('text-[#3D0E69]')
  })

  it('falls back to the neutral tone for imported lessons without a colour', () => {
    const style = importedLessonClasses({ sourceUrl: SOURCE })
    expect(style?.surface).toContain('bg-[#9CA3AF]/25')
    expect(style?.title).toContain('text-[#374151]')
    expect(importedLessonClasses({ sourceUrl: SOURCE, color: 'purple' })?.surface).toBe(style?.surface)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/lib/lessonStyle.test.ts`
Expected: FAIL — `Failed to resolve import "./lessonStyle"`.

- [ ] **Step 3: Реализовать модуль**

```ts
// src/lib/lessonStyle.ts
import type { Lesson } from '../types'

export interface ImportedLessonClasses {
  surface: string
  surfaceStatic: string
  title: string
  meta: string
}

type Tone = 'sdo' | 'room' | 'neutral'

const TONES: Record<Tone, ImportedLessonClasses> = {
  sdo: {
    surface: 'bg-[#00382B]/30 hover:bg-[#00382B]/40 dark:bg-[#00382B]/20 dark:hover:bg-[#00382B]/30',
    surfaceStatic: 'bg-[#00382B]/30 dark:bg-[#00382B]/20',
    title: 'text-[#00382B] dark:text-[#9ED9C3]',
    meta: 'text-[#1E5C4B] dark:text-[#78B7A1]',
  },
  room: {
    surface: 'bg-[#3D0E69]/30 hover:bg-[#3D0E69]/40 dark:bg-[#3D0E69]/20 dark:hover:bg-[#3D0E69]/30',
    surfaceStatic: 'bg-[#3D0E69]/30 dark:bg-[#3D0E69]/20',
    title: 'text-[#3D0E69] dark:text-[#D9C6EC]',
    meta: 'text-[#553470] dark:text-[#B79CCF]',
  },
  neutral: {
    surface: 'bg-[#9CA3AF]/25 hover:bg-[#9CA3AF]/35 dark:bg-[#9CA3AF]/15 dark:hover:bg-[#9CA3AF]/25',
    surfaceStatic: 'bg-[#9CA3AF]/25 dark:bg-[#9CA3AF]/15',
    title: 'text-[#374151] dark:text-[#D1D5DB]',
    meta: 'text-[#6B7280] dark:text-[#9CA3AF]',
  },
}

function toneFor(color?: string): Tone {
  if (color === 'blue') return 'sdo'
  if (color === 'green') return 'room'
  return 'neutral'
}

export function importedLessonClasses(lesson: Pick<Lesson, 'sourceUrl' | 'color'>): ImportedLessonClasses | null {
  if (!lesson.sourceUrl) return null
  return TONES[toneFor(lesson.color)]
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run src/lib/lessonStyle.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/lessonStyle.ts src/lib/lessonStyle.test.ts
git commit -m "feat: add imported lesson style helper"
```

---

### Task 2: Сетка месяца

**Files:**
- Modify: `src/components/schedule/MonthView.tsx:57-75`
- Test: `src/components/schedule/MonthView.test.tsx`

**Interfaces:**
- Consumes: `importedLessonClasses` из `../lib/lessonStyle`.
- Produces: чип занятия в ячейке месяца с заливкой; ручное занятие — без изменений.

- [ ] **Step 1: Добавить падающий тест**

```tsx
// в src/components/schedule/MonthView.test.tsx, рядом с coloredOnceLessons
const importedOnceLesson: Lesson[] = [
  {
    id: '9',
    type: 'once',
    title: 'СДО пара',
    weekday: 4,
    startTime: '15:00',
    endTime: '16:00',
    date: '2026-08-06',
    color: 'blue',
    sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
  },
]

// внутри describe('MonthView')
it('fills an imported lesson and drops its dot', () => {
  renderView(importedOnceLesson)
  const title = screen.getByText('СДО пара')
  const chip = title.closest('button')
  expect(chip?.className).toContain('bg-[#00382B]/30')
  expect(title.className).toContain('text-[#00382B]')
  expect(chip?.querySelector('.bg-blue-500')).toBeNull()
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
Expected: FAIL — класс `bg-[#00382B]/30` отсутствует.

- [ ] **Step 3: Переписать рендер чипа**

```tsx
// src/components/schedule/MonthView.tsx
import { importedLessonClasses } from '../../lib/lessonStyle'

// внутри visible.map(...)
visible.map((l) => {
  const style = importedLessonClasses(l)
  return (
    <button
      key={l.id}
      type="button"
      onClick={() => onEdit(l)}
      title={l.title}
      className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors ${
        style ? style.surface : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
      }`}
    >
      {!style && l.color && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
      <span className={`text-[10px] ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{l.startTime}</span>
      <span className={`min-w-0 flex-1 truncate text-[10px] font-medium ${style ? style.title : 'text-gray-800 dark:text-gray-200'}`}>{l.title}</span>
    </button>
  )
})
```

- [ ] **Step 4: Убедиться, что все тесты MonthView проходят**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
Expected: PASS — все тесты, включая прежний «shows a colored marker for each lesson color».

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule/MonthView.tsx src/components/schedule/MonthView.test.tsx
git commit -m "feat: fill imported lessons in the month grid"
```

---

### Task 3: Сетка недели

**Files:**
- Modify: `src/components/schedule/WeekView.tsx:32-46`
- Test: `src/components/schedule/WeekView.test.tsx` (новый файл)

**Interfaces:**
- Consumes: `importedLessonClasses`.
- Produces: чип занятия в колонке дня с заливкой.

- [ ] **Step 1: Написать падающий тест**

```tsx
// src/components/schedule/WeekView.test.tsx
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeekView from './WeekView'
import type { Lesson } from '../../types'

const imported: Lesson[] = [
  {
    id: '1',
    type: 'once',
    title: 'СДО пара',
    weekday: 4,
    startTime: '15:00',
    endTime: '16:00',
    date: '2026-08-06',
    color: 'blue',
    sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
  },
]
const manual: Lesson[] = [
  { id: '2', type: 'once', title: 'Своя пара', weekday: 4, startTime: '15:00', endTime: '16:00', date: '2026-08-06', color: 'blue' },
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('WeekView', () => {
  it('fills an imported lesson and drops its dot', () => {
    render(<WeekView lessons={imported} onEdit={() => {}} />)
    const chip = screen.getByText('СДО пара').closest('button')
    expect(chip?.className).toContain('bg-[#00382B]/30')
    expect(chip?.querySelector('.bg-blue-500')).toBeNull()
  })

  it('keeps the dot for a manually created lesson', () => {
    render(<WeekView lessons={manual} onEdit={() => {}} />)
    const chip = screen.getByText('Своя пара').closest('button')
    expect(chip?.className).toContain('bg-gray-50')
    expect(chip?.querySelector('.bg-blue-500')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/components/schedule/WeekView.test.tsx`
Expected: FAIL — заливки нет.

- [ ] **Step 3: Переписать рендер чипа**

```tsx
// src/components/schedule/WeekView.tsx
import { importedLessonClasses } from '../../lib/lessonStyle'

// внутри dayLessons.map(...)
dayLessons.map((l) => {
  const style = importedLessonClasses(l)
  return (
    <button
      key={l.id}
      type="button"
      onClick={() => onEdit(l)}
      className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
        style ? style.surface : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {!style && l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
        <span className={`truncate text-xs font-medium ${style ? style.title : 'text-gray-800 dark:text-gray-200'}`}>{l.title}</span>
      </span>
      <span className={`block text-[11px] ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{l.startTime}–{l.endTime}</span>
    </button>
  )
})
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/components/schedule/WeekView.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule/WeekView.tsx src/components/schedule/WeekView.test.tsx
git commit -m "feat: fill imported lessons in the week grid"
```

---

### Task 4: Карточка дневного вида

**Files:**
- Modify: `src/components/schedule/LessonCard.tsx:4-24`
- Test: `src/components/schedule/LessonCard.test.tsx` (новый файл)

**Interfaces:**
- Consumes: `importedLessonClasses`.
- Produces: фон всей карточки тонируется; мета-строки получают цвет тона.

- [ ] **Step 1: Написать падающий тест**

```tsx
// src/components/schedule/LessonCard.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LessonCard from './LessonCard'
import type { Lesson } from '../../types'

const imported: Lesson = {
  id: '1',
  type: 'once',
  title: 'Пара из РАНХиГС',
  weekday: 4,
  startTime: '09:00',
  endTime: '10:30',
  location: 'каб. 305',
  color: 'green',
  sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
}
const manual: Lesson = { ...imported, id: '2', title: 'Своя пара', sourceUrl: undefined }

describe('LessonCard', () => {
  it('tints the whole card for an imported lesson', () => {
    render(<LessonCard lesson={imported} isNow={false} onEdit={() => {}} />)
    const card = screen.getByRole('button')
    expect(card.className).toContain('bg-[#3D0E69]/30')
    expect(card.querySelector('.bg-green-500')).toBeNull()
    expect(screen.getByText(/09:00/).className).toContain('text-[#553470]')
  })

  it('keeps the white card and the dot for a manual lesson', () => {
    render(<LessonCard lesson={manual} isNow={false} onEdit={() => {}} />)
    const card = screen.getByRole('button')
    expect(card.className).toContain('bg-white')
    expect(card.querySelector('.bg-green-500')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/components/schedule/LessonCard.test.tsx`
Expected: FAIL — карточка не тонируется.

- [ ] **Step 3: Переписать карточку**

```tsx
// src/components/schedule/LessonCard.tsx
import type { Lesson } from '../../types'
import { COLOR_CLASSES } from '../../lib/constants'
import { importedLessonClasses } from '../../lib/lessonStyle'

export default function LessonCard({ lesson, isNow, onEdit }: { lesson: Lesson; isNow: boolean; onEdit: () => void }) {
  const style = importedLessonClasses(lesson)
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left shadow-sm transition-colors ${
        style ? style.surface : 'bg-white ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:ring-gray-800 dark:hover:bg-gray-800'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!style && lesson.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_CLASSES[lesson.color]?.dot ?? 'bg-gray-400'}`} />}
          <span className={`font-medium ${style ? style.title : 'text-gray-900 dark:text-gray-100'}`}>{lesson.title}</span>
          {isNow && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
        </span>
        <span className={`mt-0.5 block text-sm ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>
          {lesson.startTime} – {lesson.endTime}
          {lesson.location && ` · ${lesson.location}`}
        </span>
        {lesson.note && <span className={`block text-xs ${style ? style.meta : 'text-gray-400 dark:text-gray-500'}`}>{lesson.note}</span>}
      </span>
    </button>
  )
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/components/schedule/LessonCard.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule/LessonCard.tsx src/components/schedule/LessonCard.test.tsx
git commit -m "feat: tint the day card of imported lessons"
```

---

### Task 5: Карточка расписания на дашборде

**Files:**
- Modify: `src/components/dashboard/TodayScheduleCard.tsx:16-23`
- Test: `src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `importedLessonClasses`, поле `surfaceStatic` (без `hover:` — строка не кликабельна).
- Produces: строка списка с тонированным фоном; ручное занятие сохраняет точку.

- [ ] **Step 1: Добавить падающий тест**

```tsx
// внутри describe('DashboardPage') в src/pages/DashboardPage.test.tsx
it('fills imported lessons in the schedule card', () => {
  const now = new Date()
  useStore.setState({
    lessons: [
      {
        id: 'i1',
        type: 'once',
        weekday: now.getDay(),
        startTime: '09:00',
        endTime: '10:00',
        date: toISODate(now),
        title: 'Пара из РАНХиГС',
        color: 'green',
        sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
      },
      {
        id: 'i2',
        type: 'once',
        weekday: now.getDay(),
        startTime: '11:00',
        endTime: '12:00',
        date: toISODate(now),
        title: 'Своя пара',
        color: 'green',
      },
    ],
  })

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )

  const importedRow = screen.getByText('Пара из РАНХиГС').closest('li')
  expect(importedRow?.className).toContain('bg-[#3D0E69]/30')
  expect(importedRow?.querySelector('.bg-green-500')).toBeNull()

  const manualRow = screen.getByText('Своя пара').closest('li')
  expect(manualRow?.className).not.toContain('bg-[#3D0E69]/30')
  expect(manualRow?.querySelector('.bg-green-500')).not.toBeNull()
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/pages/DashboardPage.test.tsx`
Expected: FAIL — фон строки не тонируется.

- [ ] **Step 3: Переписать строку списка**

```tsx
// src/components/dashboard/TodayScheduleCard.tsx
import { importedLessonClasses } from '../../lib/lessonStyle'

// внутри todays.map(...)
todays.map((l) => {
  const style = importedLessonClasses(l)
  return (
    <li key={l.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${style ? style.surfaceStatic : ''}`}>
      {!style && l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
      <span className={`min-w-0 flex-1 truncate ${style ? style.title : 'text-gray-800 dark:text-gray-200'}`}>{l.title}</span>
      <span className={`shrink-0 text-xs ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{l.startTime}</span>
      {isLessonNow(l) && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
    </li>
  )
})
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/pages/DashboardPage.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Коммит**

```bash
git add src/components/dashboard/TodayScheduleCard.tsx src/pages/DashboardPage.test.tsx
git commit -m "feat: fill imported lessons on the dashboard"
```

---

### Task 6: Полная проверка

**Files:** нет новых.

- [ ] **Step 1: Проверить типы**

Run: `npx tsc -b`
Expected: без вывода, exit code 0.

- [ ] **Step 2: Прогнать весь фронтенд-набор**

Run: `npx vitest run`
Expected: PASS — не меньше 45 файлов и 263 теста (плюс новые), 0 падений.

- [ ] **Step 3: Собрать прод-бандл**

Run: `npm run build`
Expected: `vite build` завершился успешно; в выводе присутствуют классы заливки.

- [ ] **Step 4: Финальный коммит (если появились правки)**

```bash
git status --short
```
Expected: пусто. Если нет — закоммитить изменения одним коммитом `chore: finish imported lesson highlight`.
