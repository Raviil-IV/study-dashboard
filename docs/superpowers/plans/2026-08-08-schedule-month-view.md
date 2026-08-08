# Schedule Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a «Месяц» (month) tab to the schedule: a calendar grid of the selected month with lessons per day, month paging (←/→), and a «Сегодня» button.

**Architecture:** A pure helper `getMonthGrid(year, month)` in `src/lib/date.ts` builds the 42-cell grid (6 weeks, Monday-first, days from adjacent months flagged `inMonth: false`). A new `MonthView` component renders the header (‹ title › + «Сегодня» button) and the grid; each cell filters lessons exactly like `DayView`/`WeekView` (`once` by date, `weekly` by weekday), shows up to 4 lessons + «+ ещё N», and carries `IconButton` edit/delete actions per lesson. `SchedulePage` gains a third tab and renders `MonthView`, reusing the existing modal/confirm handlers.

**Tech Stack:** React 19, TypeScript (strict), Tailwind v4, Vitest + Testing Library.

## Global Constraints

- All UI text in Russian.
- TypeScript strict: `noUnusedLocals`/`noUnusedParameters` — unused imports fail `npm run build`.
- Import paths from `src/components/schedule/` are `../../lib/...`, `../../types`, `../ui/...`.
- TDD: write the failing test first, verify it fails, then implement.
- Time-dependent tests must pin time: `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.setSystemTime(new Date(2026, 7, 6, 12, 0))` (Thursday 2026-08-06), `afterEach(() => vi.useRealTimers())`.
- Grid facts for August 2026 (pinned time): grid spans 2026-07-26 (Monday) … 2026-09-05 (Sunday); 1 Aug is Saturday; month title is «август 2026 г.».
- Do not touch `.superpowers/sdd/ledger.md` — controller's job.
- Commit messages in English, imperative mood.

---

### Task 1: `getMonthGrid` calendar grid helper

**Files:**
- Modify: `src/lib/date.ts` (add `CalendarDay`, `getMonthGrid`)
- Test: `src/lib/date.test.ts`

**Interfaces:**
- Produces: `interface CalendarDay { date: Date; iso: string; inMonth: boolean }` and `getMonthGrid(year: number, month: number): CalendarDay[]` — 42 cells, first cell is the Monday on/before the 1st of the month; `iso` is `toISODate(date)`; `inMonth` is `date.getMonth() === month`.
- Consumes: existing `toISODate` from `src/lib/date`.

**Steps:**

- [ ] **Step 1: Write the failing tests** — append to `src/lib/date.test.ts` inside the existing `describe('date utils')` block:
  ```ts
  it('getMonthGrid returns 42 cells starting on Monday', () => {
    const grid = getMonthGrid(2026, 7) // August
    expect(grid).toHaveLength(42)
    expect(grid[0].date.getDay()).toBe(1) // Monday
    expect(grid[0].iso).toBe('2026-07-26')
    expect(grid[41].date.getDay()).toBe(0) // Sunday
    expect(grid[41].iso).toBe('2026-09-05')
  })

  it('getMonthGrid marks inMonth correctly', () => {
    const grid = getMonthGrid(2026, 7)
    expect(grid.find((d) => d.iso === '2026-08-01')?.inMonth).toBe(true)
    expect(grid.find((d) => d.iso === '2026-08-31')?.inMonth).toBe(true)
    expect(grid.find((d) => d.iso === '2026-07-26')?.inMonth).toBe(false)
    expect(grid.find((d) => d.iso === '2026-09-01')?.inMonth).toBe(false)
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31)
  })

  it('getMonthGrid rolls the year over for December', () => {
    const grid = getMonthGrid(2026, 11) // December 2026
    expect(grid[0].iso).toBe('2026-11-29')
    expect(grid[41].iso).toBe('2027-01-09')
    expect(grid.filter((d) => d.inMonth)).toHaveLength(31)
  })
  ```
  Also add `getMonthGrid` to the existing import from `'./date'` in the test file.
- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/lib/date.test.ts`
  Expected: FAIL — `getMonthGrid is not a function`.

- [ ] **Step 3: Implement** — append to `src/lib/date.ts`:
  ```ts
  export interface CalendarDay {
    date: Date
    iso: string
    inMonth: boolean
  }

  export function getMonthGrid(year: number, month: number): CalendarDay[] {
    const first = new Date(year, month, 1)
    const monday = new Date(year, month, 1 - ((first.getDay() + 6) % 7))
    const grid: CalendarDay[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      grid.push({ date, iso: toISODate(date), inMonth: date.getMonth() === month })
    }
    return grid
  }
  ```
- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/lib/date.test.ts`
  Expected: PASS (all date utils tests).

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/date.ts src/lib/date.test.ts
  git commit -m "Add calendar grid helper for month view"
  ```

---

### Task 2: `MonthView` component

**Files:**
- Create: `src/components/schedule/MonthView.tsx`
- Test: `src/components/schedule/MonthView.test.tsx`

**Interfaces:**
- Consumes: `CalendarDay`, `getMonthGrid`, `toISODate` from `../../lib/date`; `WEEKDAYS_SHORT`, `COLOR_CLASSES` from `../../lib/constants`; `IconButton` from `../ui/IconButton`; `Button` from `../ui/Button`; `Lesson` from `../../types`.
- Produces: `MonthView({ lessons, onEdit, onDelete }: { lessons: Lesson[]; onEdit: (l: Lesson) => void; onDelete: (id: string) => void })` — self-contained month grid with paging.

**Steps:**

- [ ] **Step 1: Write the failing tests** — create `src/components/schedule/MonthView.test.tsx`:
  ```tsx
  import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import MonthView from './MonthView'
  import type { Lesson } from '../../types'

  const weekdayLessons: Lesson[] = [
    { id: '1', type: 'weekly', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30', color: 'blue' },
  ]
  const onceLesson: Lesson[] = [
    { id: '2', type: 'once', title: 'Семинар', weekday: 5, startTime: '13:00', endTime: '14:00', date: '2026-08-07' },
  ]
  const fiveInOneDay: Lesson[] = Array.from({ length: 5 }, (_, i) => ({
    id: String(i + 1),
    type: 'weekly' as const,
    title: `Занятие ${i + 1}`,
    weekday: 4,
    startTime: `${String(9 + i).padStart(2, '0')}:00`,
    endTime: '10:00',
  }))

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // Thursday 2026-08-06
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function renderView(lessons: Lesson[] = []) {
    return render(<MonthView lessons={lessons} onEdit={() => {}} onDelete={() => {}} />)
  }

  describe('MonthView', () => {
    it('shows the current month title and weekday headers', () => {
      renderView()
      expect(screen.getByText(/август 2026/)).toBeInTheDocument()
      expect(screen.getByText('Пн')).toBeInTheDocument()
      expect(screen.getByText('Вс')).toBeInTheDocument()
    })

    it('shows a weekly lesson in its weekday cell', () => {
      renderView(weekdayLessons)
      expect(screen.getByText('Математика')).toBeInTheDocument()
    })

    it('shows a one-off lesson only on its date', () => {
      renderView(onceLesson)
      expect(screen.getByText('Семинар')).toBeInTheDocument()
    })

    it('limits cell to 4 lessons and shows "+ ещё N"', () => {
      renderView(fiveInOneDay)
      expect(screen.getAllByText(/Занятие \d/)).toHaveLength(4)
      expect(screen.getByText('+ ещё 1')).toBeInTheDocument()
    })

    it('paging with arrows changes the month title', async () => {
      const user = userEvent.setup()
      renderView()
      await user.click(screen.getByRole('button', { name: 'Следующий месяц' }))
      expect(screen.getByText(/сентябрь 2026/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
      await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
      expect(screen.getByText(/июль 2026/)).toBeInTheDocument()
    })

    it('"Сегодня" returns to the current month and is disabled there', async () => {
      const user = userEvent.setup()
      renderView()
      const today = screen.getByRole('button', { name: 'Сегодня' })
      expect(today).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Следующий месяц' }))
      expect(screen.getByText(/сентябрь 2026/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Сегодня' }))
      expect(screen.getByText(/август 2026/)).toBeInTheDocument()
    })

    it('fires onEdit and onDelete from lesson actions', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      const onDelete = vi.fn()
      render(<MonthView lessons={weekdayLessons} onEdit={onEdit} onDelete={onDelete} />)
      await user.click(screen.getByRole('button', { name: 'Редактировать' }))
      expect(onEdit).toHaveBeenCalledWith(weekdayLessons[0])
      await user.click(screen.getByRole('button', { name: 'Удалить' }))
      expect(onDelete).toHaveBeenCalledWith('1')
    })
  })
  ```
  Note: `userEvent.setup()` with fake timers needs `shouldAdvanceTime: true` — already set in `beforeEach`.
- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
  Expected: FAIL — cannot find module `./MonthView`.

- [ ] **Step 3: Implement** — create `src/components/schedule/MonthView.tsx`:
  ```tsx
  import { useState } from 'react'
  import type { Lesson } from '../../types'
  import { getMonthGrid, toISODate } from '../../lib/date'
  import { WEEKDAYS_SHORT, COLOR_CLASSES } from '../../lib/constants'
  import IconButton from '../ui/IconButton'
  import Button from '../ui/Button'

  const MAX_LESSONS = 4

  export default function MonthView({ lessons, onEdit, onDelete }: { lessons: Lesson[]; onEdit: (l: Lesson) => void; onDelete: (id: string) => void }) {
    const today = new Date()
    const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
    const grid = getMonthGrid(cursor.getFullYear(), cursor.getMonth())
    const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()
    const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
    const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
    const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <IconButton name="chevron-left" label="Предыдущий месяц" onClick={goPrev} />
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">
              {cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="secondary" size="sm" onClick={goToday} disabled={isCurrentMonth}>
              Сегодня
            </Button>
          </div>
          <IconButton name="chevron-right" label="Следующий месяц" onClick={goNext} />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="px-1 py-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              {d}
            </div>
          ))}
          {grid.map((day) => {
            const dayLessons = lessons
              .filter((l) => (l.type === 'once' ? l.date === day.iso : l.weekday === day.date.getDay()))
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
            const visible = dayLessons.slice(0, MAX_LESSONS)
            const extra = dayLessons.length - visible.length
            const isToday = day.iso === toISODate(today)
            return (
              <div
                key={day.iso}
                className={`min-h-24 rounded-xl bg-white p-1.5 shadow-sm ring-1 dark:bg-gray-900 ${
                  isToday ? 'ring-2 ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'
                } ${day.inMonth ? '' : 'opacity-40'}`}
              >
                <p className={`text-xs font-medium ${day.inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                  {day.date.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {visible.length === 0 ? (
                    <p className="text-[10px] text-gray-400">—</p>
                  ) : (
                    visible.map((l) => (
                      <div key={l.id} className="flex items-center gap-1 rounded bg-gray-50 px-1 py-0.5 dark:bg-gray-800">
                        {l.color && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-800 dark:text-gray-200">
                          {l.startTime} {l.title}
                        </p>
                        <span className="flex shrink-0">
                          <IconButton name="edit" label="Редактировать" onClick={() => onEdit(l)} />
                          <IconButton name="trash" label="Удалить" onClick={() => onDelete(l.id)} />
                        </span>
                      </div>
                    ))
                  )}
                  {extra > 0 && <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">+ ещё {extra}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  ```
- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Run build type-check**

  Run: `npm run build`
  Expected: green (no unused imports — `Button` and `IconButton` are both used).

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/schedule/MonthView.tsx src/components/schedule/MonthView.test.tsx
  git commit -m "Add month view with paging and lesson cells"
  ```

---

### Task 3: Wire «Месяц» tab into `SchedulePage`

**Files:**
- Modify: `src/pages/SchedulePage.tsx`
- Modify: `src/pages/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `MonthView` from `../components/schedule/MonthView`; existing `openEdit`/`handleDelete`.
- Produces: `SchedulePage` view state becomes `'day' | 'week' | 'month'`; third tab `{ value: 'month', label: 'Месяц' }`.

**Steps:**

- [ ] **Step 1: Write the failing tests** — append inside the `describe('SchedulePage')` block in `src/pages/SchedulePage.test.tsx` (fixture already pins Thursday 2026-08-06 with a weekly lesson on weekday 4):
  ```tsx
  it('switches to month view and shows the current month', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()
    expect(screen.getByText('Математика')).toBeInTheDocument()
  })

  it('deletes a lesson from the month view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
  })
  ```
- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/pages/SchedulePage.test.tsx`
  Expected: FAIL — `Unable to find role button with name 'Месяц'`.

- [ ] **Step 3: Implement** — edit `src/pages/SchedulePage.tsx`:
  - Add import: `import MonthView from '../components/schedule/MonthView'`
  - Change state type: `useState<'day' | 'week' | 'month'>('day')`
  - Add the tab `{ value: 'month', label: 'Месяц' }` to the `Tabs` array (after «Неделя»).
  - In the conditional render block, after the week branch, add:
    ```tsx
    ) : (
      <MonthView lessons={lessons} onEdit={openEdit} onDelete={handleDelete} />
    )}
    ```
    and change the existing ternary check to `view === 'day' ? (...DayView...) : view === 'week' ? (...WeekView...) : (...MonthView...)`.
  - The `onChange` cast must become `(v) => setView(v as 'day' | 'week' | 'month')`.
- [ ] **Step 4: Run test to verify it passes**

  Run: `npx vitest run src/pages/SchedulePage.test.tsx`
  Expected: PASS (all 10 tests).

- [ ] **Step 5: Run full suite + build**

  Run: `npx vitest run --reporter=dot` and `npm run build`
  Expected: all tests green, build green.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
  git commit -m "Add month tab to schedule page"
  ```

---

## Final State

- `getMonthGrid(year, month)` in `src/lib/date.ts` — pure, tested (42-cell grid, Monday-first, adjacent-month flags, year rollover).
- `MonthView` component — paging header (‹/› + «Сегодня», disabled on current month), weekday header row, cells with up to 4 lessons + «+ ещё N», muted adjacent-month days, highlighted today, per-lesson edit/delete actions.
- `SchedulePage` — third tab «Месяц»; day/week/month rendering reusing the same modal and confirm handlers.
- Manual check (browser): open Расписание → Месяц; page through months; verify today's ring, muted neighboring days, «+ ещё N» on dense days, edit/delete from month cells.
