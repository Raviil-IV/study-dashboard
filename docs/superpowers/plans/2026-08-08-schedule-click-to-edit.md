# Click-to-Edit for All Schedule Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать кнопки «Редактировать»/«Удалить» из всех карточек занятий (вкладки «День», «Неделя», «Месяц») — клик по занятию открывает модалку редактирования, а удаление выполняется кнопкой «Удалить» внутри модалки.

**Architecture:** Кнопки `IconButton` edit/trash убираются из `MonthView`, `WeekView` и `LessonCard`; сами блоки занятий становятся полноценными `<button type="button">` с `onClick={() => onEdit(l)}`. Удаление переносится в `LessonForm` (новый опциональный пропс `onDelete`), `SchedulePage` пробрасывает туда `handleDelete` при редактировании. Пропс `onDelete` из трёх вью удаляется — единый паттерн взаимодействия во всех вкладках.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4, Vitest + Testing Library, Zustand.

## Global Constraints

- UI-тексты — только на русском; сообщения коммитов — на английском, imperative mood, subject ≤ 50 символов, без точки в конце.
- `npm run test` = `vitest run`; точечный запуск: `npx vitest run <path>`.
- `npm run build` = `tsc -b && vite build` — TS strict (`noUnusedLocals`/`noUnusedParameters`): неиспользуемые импорты/пропсы ломают build. Убирать их в каждом задании.
- В месячном виде занятие недельного типа появляется в каждой ячейке совпадающего дня недели → в тестах только `getAllBy*` (множественные вхождения), никогда одиночные `getByText`/`getByRole`.
- Даты в тестах — локальные (`new Date(2026, 7, 6, 12, 0)`), не UTC.
- В тестах с `userEvent` и фейковыми таймерами: `vi.useFakeTimers({ shouldAdvanceTime: true })`.
- Кликабельные блоки занятий — `<button type="button">` со стилем `text-left` (доступность: Tab + Enter).
- Спека: `docs/superpowers/specs/2026-08-08-schedule-month-view-design.md`, раздел 8.

---

### Task 1: LessonForm — кнопка «Удалить» при редактировании

**Files:**
- Create: `src/components/schedule/LessonForm.test.tsx`
- Modify: `src/components/schedule/LessonForm.tsx`

**Interfaces:**
- Consumes: существующий `LessonForm` (пропсы `{ initial?, onSubmit, onCancel }`), `Button` с `variant="danger"`.
- Produces: `LessonForm` с новым опциональным пропсом `onDelete?: () => void`. Кнопка «Удалить» (variant `danger`) рендерится слева внизу формы, только когда `onDelete` передан. Задача 4 использует `onDelete` для удаления через модалку.

- [ ] **Step 1: Write the failing test**

Create `src/components/schedule/LessonForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LessonForm from './LessonForm'

const baseProps = {
  initial: undefined,
  onSubmit: () => {},
  onCancel: () => {},
}

describe('LessonForm', () => {
  it('shows no delete button when onDelete is not provided', () => {
    render(<LessonForm {...baseProps} />)
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('shows the delete button and fires onDelete when editing', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<LessonForm {...baseProps} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/schedule/LessonForm.test.tsx`
Expected: FAIL — кнопки «Удалить» нет, `getByRole` бросает «Unable to find an accessible element with the role "button" and name "Удалить"».

- [ ] **Step 3: Implement minimal code**

Modify `src/components/schedule/LessonForm.tsx`:

1. Сигнатура компонента (строка 33) — добавить `onDelete`:

```tsx
export default function LessonForm({ initial, onSubmit, onCancel, onDelete }: { initial?: Lesson; onSubmit: (values: LessonFormValues) => void; onCancel: () => void; onDelete?: () => void }) {
```

2. Блок кнопок внизу (строки 110–113) — заменить на:

```tsx
      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <Button type="button" variant="danger" onClick={onDelete}>Удалить</Button>
        ) : (
          <span />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
          <Button type="submit">Сохранить</Button>
        </div>
      </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/schedule/LessonForm.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/LessonForm.test.tsx src/components/schedule/LessonForm.tsx
git commit -m "Add delete action to lesson form"
```

---

### Task 2: MonthView — кликабельные занятия без кнопок

**Files:**
- Modify: `src/components/schedule/MonthView.tsx`
- Modify: `src/components/schedule/MonthView.test.tsx`
- Modify: `src/pages/SchedulePage.tsx:73` (убрать `onDelete` из `<MonthView>`)
- Modify: `src/pages/SchedulePage.test.tsx:121-129` (заменить тест удаления на тест клика по занятию)

**Interfaces:**
- Consumes: `MonthView` из задачи 2 плана месячного вида: пропсы `{ lessons, onEdit, onDelete }`, `MAX_LESSONS = 4`.
- Produces: `MonthView` с пропсами `{ lessons: Lesson[]; onEdit: (l: Lesson) => void }` (без `onDelete`). Строка занятия — `<button type="button">` с `onClick={() => onEdit(l)}` и `title={l.title}`; кнопок `IconButton` edit/trash нет. Задачи 3–4 зависят от этого типа пропсов.

- [ ] **Step 1: Write the failing tests**

Modify `src/components/schedule/MonthView.test.tsx`:

1. Строка 32–34 (`renderView`) — убрать `onDelete`:

```tsx
function renderView(lessons: Lesson[] = []) {
  return render(<MonthView lessons={lessons} onEdit={() => {}} />)
}
```

2. Тест на строках 82–93 — заменить целиком:

```tsx
  it('opens edit on lesson click and has no per-lesson buttons', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<MonthView lessons={weekdayLessons} onEdit={onEdit} />)
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(onEdit).toHaveBeenCalledWith(weekdayLessons[0])
    expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })
```

Modify `src/pages/SchedulePage.test.tsx`: тест «deletes a lesson from the month view» (строки 121–129) заменить на:

```tsx
  it('opens the edit modal when a month view lesson is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx src/pages/SchedulePage.test.tsx`
Expected: FAIL — `onEdit` не вызывается по клику на строку (кнопок с названием занятия нет), а также ошибка TS/рантайм из-за лишнего пропса `onDelete`.

- [ ] **Step 3: Implement minimal code**

Modify `src/components/schedule/MonthView.tsx`:

1. Пропсы (строка 13) — убрать `onDelete`:

```tsx
export default function MonthView({ lessons, onEdit }: { lessons: Lesson[]; onEdit: (l: Lesson) => void }) {
```

2. Строку занятия (строки 63–72) — заменить на кликабельную кнопку без `IconButton`:

```tsx
                  visible.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onEdit(l)}
                      title={l.title}
                      className="flex w-full items-center gap-1 rounded bg-gray-50 px-1 py-0.5 text-left transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                      {l.color && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{l.startTime}</span>
                      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-800 dark:text-gray-200">{l.title}</span>
                    </button>
                  ))
```

`IconButton` больше не нужен для строк занятий, но остаётся для стрелок ←/→ в шапке — импорт не удалять.

Modify `src/pages/SchedulePage.tsx` (строка 73) — убрать `onDelete={handleDelete}` из `<MonthView>`:

```tsx
        <MonthView lessons={lessons} onEdit={openEdit} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx src/pages/SchedulePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/MonthView.tsx src/components/schedule/MonthView.test.tsx src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "Make month view lessons clickable"
```

---

### Task 3: WeekView и DayView — кликабельные занятия без кнопок

**Files:**
- Modify: `src/components/schedule/WeekView.tsx`
- Modify: `src/components/schedule/LessonCard.tsx`
- Modify: `src/components/schedule/DayView.tsx`
- Modify: `src/pages/SchedulePage.tsx:69-71` (убрать `onDelete` из `<DayView>` и `<WeekView>`)
- Modify: `src/pages/SchedulePage.test.tsx` (заменить тест «adds edit and delete actions to week view cards», добавить день-вью тест)

**Interfaces:**
- Consumes: `LessonCard` из задачи 4 плана месячного вида: пропсы `{ lesson, isNow, onEdit, onDelete }`; `WeekView` с пропсами `{ lessons, onEdit, onDelete }`; `DayView` с пропсами `{ lessons, date, onEdit, onDelete }`.
- Produces:
  - `WeekView` — пропсы `{ lessons: Lesson[]; onEdit: (l: Lesson) => void }`, блок занятия — `<button type="button">`, кнопок нет.
  - `LessonCard` — пропсы `{ lesson: Lesson; isNow: boolean; onEdit: () => void }`, вся карточка — `<button type="button">`, кнопок нет.
  - `DayView` — пропсы `{ lessons: Lesson[]; date: Date; onEdit: (l: Lesson) => void }` (без `onDelete`).
  Задача 4 пробрасывает только `onEdit` во все три вью.

- [ ] **Step 1: Write the failing tests**

Modify `src/pages/SchedulePage.test.tsx`:

1. Тест «adds edit and delete actions to week view cards» (строки 86–96) — заменить на:

```tsx
  it('opens the edit modal when a week view lesson is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })
```

2. Добавить тест для дня после теста «shows a one-off lesson only on its own date in day view» (после строки 84):

```tsx
  it('opens the edit modal when a day view lesson card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    expect(screen.getByText('Редактировать занятие')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: FAIL — клик по карточке/блоку не открывает модалку (`Редактировать занятие` не найден).

- [ ] **Step 3: Implement minimal code**

Modify `src/components/schedule/WeekView.tsx`:

1. Пропсы (строка 8) — убрать `onDelete`:

```tsx
export default function WeekView({ lessons, onEdit }: { lessons: Lesson[]; onEdit: (l: Lesson) => void }) {
```

2. Блок занятия (строки 35–47) — заменить на кликабельную кнопку:

```tsx
                dayLessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onEdit(l)}
                    className="w-full rounded-md bg-gray-50 px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <span className="flex items-center gap-1.5">
                      {l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                      <span className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{l.title}</span>
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">{l.startTime}–{l.endTime}</span>
                  </button>
                ))
```

3. Удалить импорт `IconButton` (строка 4) — он больше не используется.

Modify `src/components/schedule/LessonCard.tsx` — весь файл (кнопки убраны, карточка кликабельна):

```tsx
import type { Lesson } from '../../types'
import { COLOR_CLASSES } from '../../lib/constants'

export default function LessonCard({ lesson, isNow, onEdit }: { lesson: Lesson; isNow: boolean; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:ring-gray-800 dark:hover:bg-gray-800"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {lesson.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_CLASSES[lesson.color]?.dot ?? 'bg-gray-400'}`} />}
          <span className="font-medium text-gray-900 dark:text-gray-100">{lesson.title}</span>
          {isNow && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
        </span>
        <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
          {lesson.startTime} – {lesson.endTime}
          {lesson.location && ` · ${lesson.location}`}
        </span>
        {lesson.note && <span className="block text-xs text-gray-400 dark:text-gray-500">{lesson.note}</span>}
      </span>
    </button>
  )
}
```

Modify `src/components/schedule/DayView.tsx`:

1. Пропсы (строка 5) — убрать `onDelete`:

```tsx
export default function DayView({ lessons, date, onEdit }: { lessons: Lesson[]; date: Date; onEdit: (l: Lesson) => void }) {
```

2. Вызов `LessonCard` (строки 18–26) — убрать `onDelete`:

```tsx
        dayLessons.map((l) => (
          <LessonCard
            key={l.id}
            lesson={l}
            isNow={toISODate(date) === toISODate(today) && isLessonNow(l)}
            onEdit={() => onEdit(l)}
          />
        ))
```

Modify `src/pages/SchedulePage.tsx` (строки 69–71) — убрать `onDelete={handleDelete}` из `<DayView>` и `<WeekView>`:

```tsx
      {view === 'day' ? (
        <DayView lessons={lessons} date={new Date()} onEdit={openEdit} />
      ) : view === 'week' ? (
        <WeekView lessons={lessons} onEdit={openEdit} />
      ) : (
        <MonthView lessons={lessons} onEdit={openEdit} />
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: PASS.

> Примечание: после этого шага `handleDelete` в `SchedulePage.tsx` временно неиспользуем (все вью больше не передают `onDelete`) — это не влияет на vitest (esbuild не проверяет типы), но `npm run build` упадёт до Task 4. Task 4 снова задействует `handleDelete` через `LessonForm`.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/WeekView.tsx src/components/schedule/LessonCard.tsx src/components/schedule/DayView.tsx src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "Make day and week view lessons clickable"
```

---

### Task 4: SchedulePage — удаление через модалку

**Files:**
- Modify: `src/pages/SchedulePage.tsx` (проброс `onDelete` в `LessonForm`, `handleDelete` закрывает модалку)
- Modify: `src/pages/SchedulePage.test.tsx` (тесты удаления через модалку в week и month view)

**Interfaces:**
- Consumes: `LessonForm` из задачи 1 — пропс `onDelete?: () => void`; `handleDelete(id)` из текущего `SchedulePage` (`window.confirm` + `removeLesson`).
- Produces: финальное поведение — удаление занятия только из модалки редактирования; после удаления модалка закрывается.

- [ ] **Step 1: Write the failing tests**

Modify `src/pages/SchedulePage.test.tsx` — добавить два теста (можно вставить перед тестом «validates end time after start time»):

```tsx
  it('deletes a lesson via the edit modal from the week view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
    expect(screen.queryByText('Редактировать занятие')).not.toBeInTheDocument()
  })

  it('deletes a lesson via the edit modal from the month view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    await user.click(screen.getAllByRole('button', { name: /Математика/ })[0])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(useStore.getState().lessons).toHaveLength(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: FAIL — в модалке нет кнопки «Удалить» (`getByRole` бросает), т.к. `SchedulePage` не передаёт `onDelete` в `LessonForm`.

- [ ] **Step 3: Implement minimal code**

Modify `src/pages/SchedulePage.tsx`:

1. `handleDelete` (строки 42–46) — закрывать модалку после удаления:

```tsx
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить занятие?')) {
      removeLesson(id)
      setModalOpen(false)
    }
  }
```

2. `<LessonForm>` (строки 76–81) — передать `onDelete` при редактировании:

```tsx
        <LessonForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/SchedulePage.test.tsx src/components/schedule/LessonForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "Wire modal delete for all schedule views"
```

---

## Final State

**Полная проверка:**

1. Run: `npm run test` — ожидается: все тесты зелёные (существующие 21 файл + новый `LessonForm.test.tsx`).
2. Run: `npm run build` — ожидается: успешная сборка (`tsc -b` без ошибок strict, `vite build`).
3. Вручную (`npm run dev`): вкладки «День», «Неделя», «Месяц» — у занятий нет кнопок; клик по занятию открывает модалку «Редактировать занятие»; в модалке слева внизу красная кнопка «Удалить»; после подтверждения занятие исчезает, модалка закрывается. В месячном виде названия занятий читаемы, при наведении — tooltip с полным названием.
4. Ветка: `feat/schedule-month-view`. После зелёного CI — обсудить merge в `main`.

**Проверка соответствия спеке (раздел 8):** кнопки убраны из всех трёх вкладок ✅; клик по занятию открывает редактирование ✅; удаление через кнопку «Удалить» в модалке с `window.confirm` ✅; месячный вид — название занимает ширину ячейки + `title`-tooltip ✅; кликабельные блоки — `<button type="button">` с `text-left` ✅.
