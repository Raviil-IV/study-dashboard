# Добавление события кликом по дате — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Клик по номеру дня в месячной сетке открывает форму нового события с заполненной датой.

**Architecture:** `MonthView` отдаёт выбранную дату через `onAdd`; `SchedulePage` хранит ISO-дату нового события и передаёт её в `LessonForm` как `initialDate`. Схема данных и API не меняются.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Vitest + Testing Library.

## Global Constraints

- Чипы событий внутри ячейки продолжают открывать редактирование.
- Серые даты соседних месяцев кликабельны и не переключают месяц.
- `initial` в `LessonForm` по-прежнему означает только редактирование.
- Базовый прогон: 48 файлов / 283 теста фронтенда, 15 файлов / 131 тест бэкенда.

---

### Task 1: Кликабельный номер дня в MonthView

**Files:**
- Modify: `src/components/schedule/MonthView.tsx`
- Test: `src/components/schedule/MonthView.test.tsx`

**Interfaces:**
- Produces: `MonthView` принимает `onAdd: (date: Date) => void`.

- [ ] **Step 1: Обновить хелпер и добавить падающие тесты**

```tsx
// src/components/schedule/MonthView.test.tsx
function renderView(lessons: Lesson[] = [], onAdd: (date: Date) => void = () => {}) {
  return render(<MonthView lessons={lessons} onEdit={() => {}} onAdd={onAdd} />)
}

  it('adds an event for the clicked day of the current month', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderView([], onAdd)
    await user.click(screen.getByRole('button', { name: 'Добавить событие: 6 августа' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(toISODate(onAdd.mock.calls[0][0])).toBe('2026-08-06')
  })

  it('adds an event for a grey date of the next month without switching the month', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderView([], onAdd)
    await user.click(screen.getByRole('button', { name: 'Добавить событие: 1 сентября' }))
    expect(toISODate(onAdd.mock.calls[0][0])).toBe('2026-09-01')
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()
  })
```

Импорт дополнить: `import { toISODate } from '../../lib/date'`.
В тесте `opens edit on lesson click` добавить проп: `render(<MonthView lessons={weekdayLessons} onEdit={onEdit} onAdd={() => {}} />)`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
Expected: FAIL — кнопки «Добавить событие: …» нет.

- [ ] **Step 3: Реализовать**

```tsx
// src/components/schedule/MonthView.tsx
export default function MonthView({
  lessons,
  onEdit,
  onAdd,
}: {
  lessons: Lesson[]
  onEdit: (l: Lesson) => void
  onAdd: (date: Date) => void
}) {
```

Номер дня:

```tsx
              <button
                type="button"
                onClick={() => onAdd(day.date)}
                aria-label={`Добавить событие: ${day.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
                className={`-mx-1 rounded px-1 text-xs font-medium transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-gray-800 ${
                  day.inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {day.date.getDate()}
              </button>
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/components/schedule/MonthView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule/MonthView.tsx src/components/schedule/MonthView.test.tsx
git commit -m "feat: add events by clicking a day in the month grid"
```

---

### Task 2: Дата в форме и проводка на странице

**Files:**
- Modify: `src/components/schedule/LessonForm.tsx`
- Modify: `src/pages/SchedulePage.tsx`
- Test: `src/pages/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `MonthView.onAdd`.
- Produces: `LessonForm` принимает `initialDate?: string`.

- [ ] **Step 1: Добавить падающий тест**

```tsx
// src/pages/SchedulePage.test.tsx
  it('opens a new event form with the date clicked in the month grid', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Месяц' }))
    await user.click(screen.getByRole('button', { name: 'Добавить событие: 7 августа' }))

    expect(screen.getByText('Новое событие')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'На конкретную дату' })).toBeChecked()
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-08-07')

    await user.type(screen.getByLabelText('Название'), 'Конференция')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const added = useStore.getState().lessons.at(-1)
    expect(added?.type).toBe('once')
    expect(added?.date).toBe('2026-08-07')
  })
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: FAIL — кнопки даты нет / форма не открывается.

- [ ] **Step 3: Реализовать форму**

```tsx
// src/components/schedule/LessonForm.tsx — сигнатура и начальные значения
export default function LessonForm({
  initial,
  initialDate,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Lesson
  initialDate?: string
  onSubmit: (values: LessonFormValues) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [values, setValues] = useState<LessonFormValues>(() => {
    if (initial) {
      return {
        title: initial.title,
        weekday: initial.weekday,
        startTime: initial.allDay ? '00:00' : initial.startTime,
        endTime: initial.allDay ? '23:59' : initial.endTime,
        location: initial.location ?? '',
        note: initial.note ?? '',
        color: initial.color ?? 'blue',
        type: initial.type ?? 'weekly',
        date: initial.date ?? '',
        allDay: initial.allDay ?? false,
      }
    }
    if (initialDate) return { ...DEFAULT_VALUES, type: 'once', date: initialDate }
    return DEFAULT_VALUES
  })
```

- [ ] **Step 4: Реализовать страницу**

```tsx
// src/pages/SchedulePage.tsx
import { nextLesson, pluralRu, lessonTimeLabel, toISODate } from '../lib/date'

  const [newDate, setNewDate] = useState<string | undefined>()

  const openAdd = () => {
    setEditing(undefined)
    setNewDate(undefined)
    setModalOpen(true)
  }
  const openAddOnDate = (date: Date) => {
    setEditing(undefined)
    setNewDate(toISODate(date))
    setModalOpen(true)
  }
  const openEdit = (lesson: Lesson) => {
    setEditing(lesson)
    setNewDate(undefined)
    setModalOpen(true)
  }

// рендер месяца
        <MonthView lessons={lessons} onEdit={openEdit} onAdd={openAddOnDate} />

// форма
        <LessonForm
          key={editing?.id ?? newDate ?? 'new'}
          initial={editing}
          initialDate={newDate}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/pages/SchedulePage.test.tsx src/components/schedule`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/components/schedule/LessonForm.tsx src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "feat: prefill the event date from the month grid"
```

---

### Task 3: Полная проверка

- [ ] **Step 1: Фронтенд**

Run: `npx tsc -b && npx vitest run && npm run build`
Expected: 0 ошибок типов, все тесты зелёные, сборка успешна.

- [ ] **Step 2: Бэкенд**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: 15 файлов / 131 тест зелёные.

- [ ] **Step 3: Чистое дерево**

Run: `git status --short`
Expected: пусто.
