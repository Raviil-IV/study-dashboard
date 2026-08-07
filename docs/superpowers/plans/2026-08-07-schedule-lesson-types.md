# Lesson Types (Weekly / One-off) and Week View Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lesson type (weekly recurring vs. one-off on a specific date) to the schedule, with automatic cleanup of one-off lessons after their calendar week, and add edit/delete actions to the week view cards.

**Architecture:** `Lesson` gains a required `type: 'weekly' | 'once'` and optional `date` (ISO). Weekly lessons behave exactly as today (weekday-based). One-off lessons carry a concrete date; views filter them by date instead of weekday. Storage read path migrates legacy records (missing `type` → `weekly`) and drops one-off lessons whose date precedes the current week's Monday. `nextLesson`/`isLessonNow` account for one-off dates. Week view cards get `IconButton` edit/delete actions mirroring the day view.

**Tech Stack:** React 19, TypeScript (strict), Zustand v5 `persist`, Tailwind v4, Vitest + Testing Library.

## Global Constraints

- All UI text in Russian.
- TypeScript strict: `noUnusedLocals`/`noUnusedParameters` — unused imports fail `npm run build`.
- Import paths from `src/pages/` are `../store/...`, `../lib/...` (NOT `../../` — a known trap in plan-generated code).
- TDD: write the failing test first, verify it fails, then implement.
- Time-dependent tests must pin time: `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.setSystemTime(new Date(2026, 7, 6, 12, 0))` (Thursday 2026-08-06), `afterEach(() => vi.useRealTimers())`.
- Do not use `user.type` on date inputs — use `fireEvent.change`.
- Do not touch `.superpowers/sdd/ledger.md` — controller's job.
- Commit messages in English, imperative mood.

---

### Task 1: Lesson type field, migration, and weekly cleanup

**Files:**
- Modify: `src/types/index.ts` (Lesson interface)
- Modify: `src/lib/demoData.ts` (add `type: 'weekly'`)
- Modify: `src/lib/date.ts` (add `currentWeekMonday`)
- Modify: `src/store/useStore.ts` (migrate + cleanup in `getItem`)
- Modify: `src/pages/SchedulePage.test.tsx` (fixture at line ~21)
- Test: `src/store/useStore.test.ts`

**Interfaces:**
- Produces: `Lesson.type: 'weekly' | 'once'`, `Lesson.date?: string`; `currentWeekMonday(): Date` from `src/lib/date`.
- Consumes: existing `toISODate` from `src/lib/date`.

**Steps:**

- [ ] **Step 1: Write the failing tests** in `src/store/useStore.test.ts`:
  ```ts
  it('migrates legacy lessons without type to weekly', async () => {
    localStorage.setItem('study-dashboard:lessons', JSON.stringify([{ id: '1', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30' }]))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lessons[0].type).toBe('weekly')
  })

  it('drops one-off lessons from a previous calendar week on load', async () => {
    // 2026-08-06 is Thursday; week Monday is 2026-08-03
    localStorage.setItem('study-dashboard:lessons', JSON.stringify([
      { id: '1', type: 'once', title: 'Консультация', weekday: 0, startTime: '09:00', endTime: '10:00', date: '2026-08-02' }, // last Sunday — drop
      { id: '2', type: 'once', title: 'Семинар', weekday: 4, startTime: '09:00', endTime: '10:00', date: '2026-08-06' },       // today — keep
    ]))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lessons.map((l) => l.id)).toEqual(['2'])
  })
  ```
  Pin time (Thursday 2026-08-06) in `beforeEach` (already partially there — add `vi.useFakeTimers`/`setSystemTime` if missing). Run `npx vitest run src/store/useStore.test.ts` — expect FAIL (TypeError: type is undefined / cleanup not implemented).
- [ ] **Step 2: Update `src/types/index.ts`** — add to `Lesson`:
  ```ts
  type: 'weekly' | 'once'
  date?: string // ISO YYYY-MM-DD, only for type: 'once'
  ```
- [ ] **Step 3: Update `src/lib/demoData.ts`** — add `type: 'weekly'` to all 6 demo lessons.
- [ ] **Step 4: Add `currentWeekMonday` to `src/lib/date.ts`:**
  ```ts
  export function currentWeekMonday(): Date {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    return monday
  }
  ```
- [ ] **Step 5: Update `src/store/useStore.ts`** — add a migration helper applied in BOTH read paths of `getItem` (umbrella branch and split-keys branch):
  ```ts
  import { currentWeekMonday, toISODate } from '../lib/date'

  function migrateState(state: PersistedState): PersistedState {
    const monday = toISODate(currentWeekMonday())
    return {
      ...state,
      lessons: state.lessons
        .map((l) => ({ type: 'weekly' as const, ...l }))
        .filter((l) => !(l.type === 'once' && l.date && l.date < monday)),
    }
  }
  ```
  Apply `migrateState(...)` to the parsed umbrella object and to the assembled split-keys object before returning from `getItem`.
- [ ] **Step 6: Update the fixture in `src/pages/SchedulePage.test.tsx` (~line 21)** — add `type: 'weekly'` to the lesson object (strict TS otherwise fails the build).
- [ ] **Step 7: Run full suite** — `npx vitest run --reporter=dot` green; `npm run build` green.
- [ ] **Step 8: Commit** — `GIT_EDITOR=true git commit -m "Add lesson type with migration and weekly cleanup"`

---

### Task 2: Lesson form — type picker and date field

**Files:**
- Modify: `src/components/schedule/LessonForm.tsx`
- Modify: `src/pages/SchedulePage.test.tsx` (new tests)

**Interfaces:**
- Produces: `LessonFormValues` gains `type: 'weekly' | 'once'` and `date: string` (empty = unset). On submit: for `once`, `weekday` is recomputed from `date` (`new Date(date).getDay()`); `date` is `values.date || undefined`.
- Consumes: `addLesson`/`updateLesson` (signatures unchanged — `Omit<Lesson, 'id'>` now includes `type`/`date`).

**Steps:**

- [ ] **Step 1: Write failing tests** in `src/pages/SchedulePage.test.tsx`:
  ```ts
  it('adds a one-off lesson on a specific date', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Консультация')
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    fireEvent.change(screen.getByLabelText('Дата'), { target: { value: '2026-08-07' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    const added = useStore.getState().lessons[1]
    expect(added.type).toBe('once')
    expect(added.date).toBe('2026-08-07')
    expect(added.weekday).toBe(5) // Friday
  })

  it('requires a date for one-off lessons', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Консультация')
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(1)
    expect(screen.getByText('Выберите дату')).toBeInTheDocument()
  })
  ```
  Run — expect FAIL. Note: `fireEvent.change` for the date input (not `user.type`).
- [ ] **Step 2: Implement `LessonForm.tsx`:**
  - Extend `LessonFormValues` and `DEFAULT_VALUES` with `type: 'weekly'`, `date: ''`.
  - Prefill from `initial`: `type: initial.type ?? 'weekly'`, `date: initial.date ?? ''`.
  - Add a radio group at the top: fieldset/legend «Тип занятия» with two radios — «Регулярное (каждую неделю)» and «На конкретную дату» (inline `<input type="radio">` + `<label>`, `name="lessonType"`).
  - If `type === 'once'`: show `<Input label="Дата" type="date" min={toISODate(new Date())} ...>` instead of the «День недели» select; weekday is derived on submit.
  - Validation: for `once`, `if (!values.date) { setError('Выберите дату'); return }`.
  - On submit: build `weekday` as `type === 'once' && values.date ? new Date(values.date).getDay() : values.weekday`; pass `date: values.date || undefined`.
- [ ] **Step 3: Run tests** — `npx vitest run --reporter=dot` green; `npm run build` green.
- [ ] **Step 4: Commit** — `GIT_EDITOR=true git commit -m "Add lesson type picker and date field to form"`

---

### Task 3: Day/week views — date-aware filtering and week view actions

**Files:**
- Modify: `src/components/schedule/DayView.tsx`
- Modify: `src/components/schedule/WeekView.tsx`
- Modify: `src/pages/SchedulePage.tsx`
- Modify: `src/pages/SchedulePage.test.tsx` (new tests)

**Interfaces:**
- Produces: `WeekView` props become `{ lessons: Lesson[]; onEdit: (l: Lesson) => void; onDelete: (id: string) => void }`.
- Consumes: `toISODate` from `src/lib/date`; `IconButton` from `../ui/IconButton`.

**Steps:**

- [ ] **Step 1: Write failing tests** in `src/pages/SchedulePage.test.tsx`:
  ```ts
  it('shows a one-off lesson only on its own date in day view', () => {
    useStore.setState({ lessons: [{ id: '2', type: 'once', title: 'Семинар', weekday: 4, startTime: '13:00', endTime: '14:00', date: '2026-08-06' }] })
    renderPage()
    expect(screen.getByText('Семинар')).toBeInTheDocument()
  })

  it('adds edit and delete actions to week view cards', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
  })
  ```
  Run — expect FAIL (week view has no buttons).
- [ ] **Step 2: Update `DayView.tsx`** — filter:
  ```ts
  const dayLessons = lessons
    .filter((l) => (l.type === 'once' ? l.date === toISODate(date) : l.weekday === date.getDay()))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  ```
- [ ] **Step 3: Update `WeekView.tsx`:**
  - Accept `{ lessons, onEdit, onDelete }`.
  - Per calendar day: filter `weekly` by `weekday === weekday` OR `once` with `l.date === toISODate(date)`.
  - In each mini-card add an actions row: `<IconButton name="edit" label="Редактировать" onClick={() => onEdit(l)} />` and `<IconButton name="trash" label="Удалить" onClick={() => onDelete(l.id)} />` (mirror `LessonCard.tsx`; import `IconButton` from `../ui/IconButton`).
- [ ] **Step 4: Update `SchedulePage.tsx`** — render `<WeekView lessons={lessons} onEdit={openEdit} onDelete={handleDelete} />`.
- [ ] **Step 5: Run tests + build** — full suite green, `npm run build` green.
- [ ] **Step 6: Commit** — `GIT_EDITOR=true git commit -m "Add lesson actions to week view and date-aware filtering"`

---

### Task 4: `nextLesson` / `isLessonNow` with one-off lessons

**Files:**
- Modify: `src/lib/date.ts`
- Test: `src/lib/date.test.ts`

**Interfaces:**
- Produces: `isLessonNow(lesson: { type?: 'weekly' | 'once'; date?: string; weekday: number; startTime: string; endTime: string }): boolean` — legacy objects without `type` keep old behavior (backward compatible).
- Consumes: `toISODate`, `daysUntil`.

**Steps:**

- [ ] **Step 1: Write failing tests** in `src/lib/date.test.ts` (time pinned to Thu 2026-08-06, 12:00):
  ```ts
  it('isLessonNow considers a one-off lesson only on its date', () => {
    const today = { type: 'once', date: '2026-08-06', weekday: 4, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(today)).toBe(true)
    const otherDay = { type: 'once', date: '2026-08-07', weekday: 5, startTime: '11:00', endTime: '13:00' }
    expect(isLessonNow(otherDay)).toBe(false)
  })

  it('nextLesson skips past one-off lessons and orders by date', () => {
    const lessons = [
      { id: '1', type: 'once', title: 'Старое', weekday: 4, startTime: '09:00', endTime: '10:00', date: '2026-08-05' },
      { id: '2', type: 'once', title: 'Завтра', weekday: 5, startTime: '10:00', endTime: '11:00', date: '2026-08-07' },
    ] as Lesson[]
    const next = nextLesson(lessons)
    expect(next?.id).toBe('2')
  })
  ```
  Run — expect FAIL (one-off treated as weekly today).
- [ ] **Step 2: Update `isLessonNow`** — when `type === 'once'`: return `false` unless `date === toISODate(new Date())`; then time-range check. Otherwise keep current weekday+time logic.
- [ ] **Step 3: Update `nextLesson`** — for each lesson compute:
  - `weekly`: current logic (`diffDays` from weekday).
  - `once`: skip if `date < toISODate(now)`; else `diffDays = daysUntil(date)`; if `diffDays === 0 && start <= nowMinutes` → push to next week (`key = 7 * 1440 + start`), else `key = diffDays * 1440 + start`.
  - Sort by key, return the first.
- [ ] **Step 4: Run full suite + build** — green.
- [ ] **Step 5: Commit** — `GIT_EDITOR=true git commit -m "Account for one-off lessons in next and now helpers"`

---

## Final State

- `Lesson` has `type`/`date`; legacy data migrates to `weekly` on load; one-off lessons older than the current week's Monday are dropped on load.
- Lesson form offers «Регулярное (каждую неделю)» vs «На конкретную дату» with validation.
- Day and week views show one-off lessons only on their date; week view cards have edit/delete actions.
- `nextLesson` and the «сейчас» marker respect one-off dates.
- Manual check (browser): add weekly + one-off lessons, edit/delete from week view, verify one-off disappears next Monday after reload.
