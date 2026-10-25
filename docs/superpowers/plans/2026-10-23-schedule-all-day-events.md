# События на весь день — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В разделе «Расписание» появляются события «на весь день», приглушённые кнопки и текст «событие» вместо «занятие».

**Architecture:** Флаг `allDay` хранится в БД, время-заглушка `00:00–23:59` не покидает API. Хелпер `lessonTimeLabel` в `src/lib/date.ts` — единая точка форматирования времени для всех видов. Варианты кнопок добавляются в `Button`, не затрагивая существующие.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Zustand, Express + Drizzle ORM + PostgreSQL, Vitest, drizzle-kit.

## Global Constraints

- Импорт и автосинк РАНХиГС не меняются: импортированные занятия всегда `allDay = false`.
- Время при `allDay` — ровно `00:00` и `23:59`.
- Переименование «занятие → событие» только в разделе «Расписание» (страница, форма, модалка, пустые состояния).
- Существующие варианты `Button` (`primary`, `secondary`, `danger`) не меняются.
- Базовый прогон до работ: фронтенд 48 файлов / 273 теста, бэкенд 15 файлов / 129 тестов, `tsc` без ошибок.

---

### Task 1: Схема БД и бэкенд

**Files:**
- Modify: `backend/src/db/schema.ts:26-43`
- Modify: `backend/src/lib/validation.ts:24-40`
- Create: `backend/drizzle/0007_*.sql` (генерируется)
- Modify: `backend/drizzle/meta/_journal.json` и новый snapshot (генерируются)
- Test: `backend/test/entities.test.ts`

**Interfaces:**
- Produces: колонка `lessons.all_day boolean not null default false`; `lessonSchema` принимает `allDay?: boolean`.

- [ ] **Step 1: Добавить колонку в схему**

```ts
// backend/src/db/schema.ts — в определение lessons, после color
    sourceUrl: text('source_url'),
    allDay: boolean('all_day').notNull().default(false),
```

- [ ] **Step 2: Разрешить поле в валидации**

```ts
// backend/src/lib/validation.ts — в lessonSchema
    color: z.string().max(20).optional(),
    allDay: z.boolean().optional(),
```

- [ ] **Step 3: Сгенерировать миграцию**

Run: `cd backend && npx drizzle-kit generate`
Expected: создан `drizzle/0007_<name>.sql` с `ALTER TABLE "lessons" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;`, обновлён `meta/_journal.json`.

- [ ] **Step 4: Добавить падающий тест**

```ts
// backend/test/entities.test.ts, в describe('entities CRUD')
  it('stores the allDay flag and toggles it with a patch', async () => {
    const agent = createAgent()
    await signUp(agent, 'all-day')
    const id = randomUUID()
    const created = await agent
      .post('/api/lessons')
      .send({ ...lessonPayload(id), allDay: true, startTime: '00:00', endTime: '23:59' })
    expect(created.status).toBe(201)
    expect(created.body.allDay).toBe(true)

    const patched = await agent.patch(`/api/lessons/${id}`).send({ allDay: false })
    expect(patched.status).toBe(200)
    expect(patched.body.allDay).toBe(false)
  })

  it('defaults allDay to false for a row inserted without the flag', async () => {
    const agent = createAgent()
    const { res: reg } = await signUp(agent, 'all-day-default')
    const id = randomUUID()
    await db.insert(lessons).values({ ...lessonPayload(id), userId: reg.body.id })
    const [row] = await db.select().from(lessons).where(eq(lessons.id, id))
    expect(row.allDay).toBe(false)
  })
```

- [ ] **Step 5: Прогнать бэкенд-тесты**

Run: `cd backend && npm test`
Expected: 15 файлов / 131 тест, всё зелёное.

- [ ] **Step 6: Коммит**

```bash
git add backend/src/db/schema.ts backend/src/lib/validation.ts backend/drizzle backend/test/entities.test.ts
git commit -m "feat: add allDay flag to lessons"
```

---

### Task 2: Тип и хелперы даты

**Files:**
- Modify: `src/types/index.ts:1-13`
- Modify: `src/lib/date.ts:65-106`
- Test: `src/lib/date.test.ts`

**Interfaces:**
- Produces: `Lesson.allDay?: boolean`; `lessonTimeLabel(lesson): string` → `'Весь день'` или `'09:00 – 10:30'`; `isLessonNow` учитывает `allDay`; `nextLesson` не переносит событие «на весь день» на следующую неделю.

- [ ] **Step 1: Добавить поле в тип**

```ts
// src/types/index.ts — в Lesson
  color?: string
  allDay?: boolean // событие без конкретного времени
  sourceUrl?: string
```

- [ ] **Step 2: Написать падающие тесты**

```ts
// src/lib/date.test.ts — импорт дополнить lessonTimeLabel
import { ..., lessonTimeLabel } from './date'

  it('lessonTimeLabel shows the time range or «Весь день»', () => {
    expect(lessonTimeLabel({ startTime: '09:00', endTime: '10:30' })).toBe('09:00 – 10:30')
    expect(lessonTimeLabel({ allDay: true, startTime: '00:00', endTime: '23:59' })).toBe('Весь день')
  })

  it('isLessonNow treats an all-day event as running for the whole day', () => {
    expect(isLessonNow({ weekday: 4, startTime: '00:00', endTime: '23:59', allDay: true })).toBe(true)
    expect(isLessonNow({ weekday: 5, startTime: '00:00', endTime: '23:59', allDay: true })).toBe(false)
  })

  it('nextLesson keeps today\u2019s all-day event as the nearest one', () => {
    const lessons = [
      { id: 'a', title: 'Конференция', weekday: 4, startTime: '00:00', endTime: '23:59', allDay: true },
      { id: 'b', title: 'Физика', weekday: 4, startTime: '14:00', endTime: '15:00' },
    ] as Lesson[]
    expect(nextLesson(lessons)?.id).toBe('a')
  })
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run src/lib/date.test.ts`
Expected: FAIL — `lessonTimeLabel is not a function`.

- [ ] **Step 4: Реализовать**

```ts
// src/lib/date.ts
export function lessonTimeLabel(lesson: { allDay?: boolean; startTime: string; endTime: string }): string {
  return lesson.allDay ? 'Весь день' : `${lesson.startTime} – ${lesson.endTime}`
}

export function isLessonNow(lesson: {
  type?: 'weekly' | 'once'
  date?: string
  weekday: number
  startTime: string
  endTime: string
  allDay?: boolean
}): boolean {
  const now = new Date()
  if (lesson.type === 'once') {
    if (lesson.date !== toISODate(now)) return false
  } else if (lesson.weekday !== now.getDay()) {
    return false
  }
  if (lesson.allDay) return true
  const minutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = lesson.startTime.split(':').map(Number)
  const [eh, em] = lesson.endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return minutes >= start && minutes < end
}

// nextLesson: внутри цикла
    const [h, m] = lesson.startTime.split(':').map(Number)
    const start = lesson.allDay ? 0 : h * 60 + m
    // ...
    const key =
      diffDays === 0 && !lesson.allDay && start <= nowMinutes ? 7 * 1440 + start : diffDays * 1440 + start
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/lib/date.test.ts`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/types/index.ts src/lib/date.ts src/lib/date.test.ts
git commit -m "feat: support all-day flag in date helpers"
```

---

### Task 3: Мягкие варианты кнопок

**Files:**
- Modify: `src/components/ui/Button.tsx:3-15`

**Interfaces:**
- Produces: варианты `subtle` и `subtleDanger`.

- [ ] **Step 1: Расширить варианты**

```tsx
type Variant = 'primary' | 'secondary' | 'danger' | 'subtle' | 'subtleDanger'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
  secondary: 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  subtle:
    'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus-visible:ring-indigo-400 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60',
  subtleDanger:
    'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
}
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc -b`
Expected: без ошибок.

- [ ] **Step 3: Коммит**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: add subtle button variants"
```

---

### Task 4: Форма события

**Files:**
- Modify: `src/components/schedule/LessonForm.tsx`
- Test: `src/components/schedule/LessonForm.test.tsx`

**Interfaces:**
- Consumes: `Lesson.allDay`.
- Produces: `LessonFormValues.allDay: boolean`; чекбокс «Весь день»; тексты «событие».

- [ ] **Step 1: Добавить падающий тест**

```tsx
// src/components/schedule/LessonForm.test.tsx
  it('hides the time inputs when the whole-day checkbox is on', async () => {
    const user = userEvent.setup()
    render(<LessonForm {...baseProps} />)
    expect(screen.getByLabelText('Начало')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Весь день'))
    expect(screen.queryByLabelText('Начало')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Конец')).not.toBeInTheDocument()
  })

  it('submits an all-day event with the sentinel times', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LessonForm {...baseProps} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Название'), 'Конференция')
    await user.click(screen.getByLabelText('Весь день'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Конференция',
      allDay: true,
      startTime: '00:00',
      endTime: '23:59',
    })
  })
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/components/schedule/LessonForm.test.tsx`
Expected: FAIL — нет чекбокса «Весь день».

- [ ] **Step 3: Реализовать форму**

```tsx
// src/components/schedule/LessonForm.tsx
export interface LessonFormValues {
  title: string
  weekday: number
  startTime: string
  endTime: string
  location: string
  note: string
  color: string
  type: 'weekly' | 'once'
  date: string
  allDay: boolean
}

const DEFAULT_VALUES: LessonFormValues = {
  title: '',
  weekday: 1,
  startTime: '09:00',
  endTime: '10:30',
  location: '',
  note: '',
  color: 'blue',
  type: 'weekly',
  date: '',
  allDay: false,
}

export default function LessonForm({ initial, onSubmit, onCancel, onDelete }: {...}) {
  const [values, setValues] = useState<LessonFormValues>(() =>
    initial
      ? {
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
      : DEFAULT_VALUES,
  )
  // Время, к которому вернёмся при снятии флага «Весь день».
  const [timed, setTimed] = useState(() => ({
    startTime: initial?.allDay || !initial ? '09:00' : initial.startTime,
    endTime: initial?.allDay || !initial ? '10:30' : initial.endTime,
  }))
  const [error, setError] = useState('')

  const toggleAllDay = (checked: boolean) => {
    if (checked) {
      setValues({ ...values, allDay: true, startTime: '00:00', endTime: '23:59' })
    } else {
      setValues({ ...values, allDay: false, ...timed })
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите название события')
      return
    }
    if (!values.allDay && values.endTime <= values.startTime) {
      setError('Время конца должно быть позже времени начала')
      return
    }
    if (values.type === 'once' && !values.date) {
      setError('Выберите дату')
      return
    }
    onSubmit({
      ...values,
      weekday: values.type === 'once' && values.date ? parseLocalDate(values.date).getDay() : values.weekday,
    })
  }
```

В разметке после `fieldset` с типом:

```tsx
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={values.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
        Весь день
      </label>
```

Поля времени оборачиваются в условие и обновляют `timed`:

```tsx
      {!values.allDay && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Начало"
            type="time"
            value={values.startTime}
            onChange={(e) => {
              setValues({ ...values, startTime: e.target.value })
              setTimed((t) => ({ ...t, startTime: e.target.value }))
            }}
          />
          <Input
            label="Конец"
            type="time"
            value={values.endTime}
            onChange={(e) => {
              setValues({ ...values, endTime: e.target.value })
              setTimed((t) => ({ ...t, endTime: e.target.value }))
            }}
          />
        </div>
      )}
```

Текст легенды: `Тип события`.

- [ ] **Step 4: Прогнать тесты формы**

Run: `npx vitest run src/components/schedule/LessonForm.test.tsx`
Expected: PASS — все тесты файла.

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule/LessonForm.tsx src/components/schedule/LessonForm.test.tsx
git commit -m "feat: add whole-day checkbox to the event form"
```

---

### Task 5: Страница расписания

**Files:**
- Modify: `src/pages/SchedulePage.tsx`
- Test: `src/pages/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `lessonTimeLabel`, варианты `subtle`/`subtleDanger`, `LessonFormValues.allDay`.

- [ ] **Step 1: Обновить тесты под новые подписи**

```tsx
// заменить все вхождения в src/pages/SchedulePage.test.tsx
'Добавить занятие'      -> 'Добавить событие'
'Редактировать занятие' -> 'Редактировать событие'
```

Добавить тест:

```tsx
  it('creates an all-day event from the form', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить событие' }))
    await user.type(screen.getByLabelText('Название'), 'День открытых дверей')
    await user.click(screen.getByLabelText('Весь день'))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const added = useStore.getState().lessons.at(-1)
    expect(added?.allDay).toBe(true)
    expect(added?.startTime).toBe('00:00')
    expect(screen.getByText('Весь день')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: FAIL — кнопки «Добавить событие» нет.

- [ ] **Step 3: Реализовать**

```tsx
// src/pages/SchedulePage.tsx
import { lessonTimeLabel } from '../lib/date'

  const next = nextLesson(lessons)

// подзаголовок и кнопки
        subtitle={next ? `Следующее событие: ${next.title} · ${lessonTimeLabel(next)}` : 'Событий пока нет'}
        action={
          <>
            {ranepaImports.length > 0 && (
              <Button variant="subtleDanger" onClick={handleDeleteImport}>
                Удалить импорт
              </Button>
            )}
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              {ranepaImports.length > 0 ? 'Обновить из РАНХиГС' : 'Импорт из РАНХиГС'}
            </Button>
            <Button variant="subtle" onClick={openAdd}>Добавить событие</Button>
          </>
        }

// подтверждение удаления
    if (window.confirm('Удалить событие?')) {

// заголовок модалки
      <Modal open={modalOpen} title={editing ? 'Редактировать событие' : 'Новое событие'} onClose={() => setModalOpen(false)}>
```

- [ ] **Step 4: Прогнать тесты страницы**

Run: `npx vitest run src/pages/SchedulePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "feat: rename lessons to events on the schedule page"
```

---

### Task 6: Отображение «Весь день» во всех видах

**Files:**
- Modify: `src/components/schedule/LessonCard.tsx`
- Modify: `src/components/schedule/WeekView.tsx`
- Modify: `src/components/schedule/MonthView.tsx`
- Modify: `src/components/schedule/DayView.tsx`
- Modify: `src/components/dashboard/TodayScheduleCard.tsx`
- Test: `src/components/schedule/LessonCard.test.tsx`, `WeekView.test.tsx`, `MonthView.test.tsx`, `src/pages/DashboardPage.test.tsx`

- [ ] **Step 1: Добавить падающие тесты**

```tsx
// LessonCard.test.tsx
  it('shows «Весь день» for an all-day event', () => {
    const allDay: Lesson = { ...manual, id: '3', title: 'Конференция', allDay: true, startTime: '00:00', endTime: '23:59' }
    render(<LessonCard lesson={allDay} isNow={false} onEdit={() => {}} />)
    expect(screen.getByText(/Весь день/)).toBeInTheDocument()
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument()
  })
```

```tsx
// WeekView.test.tsx
  it('shows «Весь день» for an all-day event', () => {
    const allDay: Lesson[] = [{ ...manual[0], id: '3', title: 'Конференция', allDay: true, startTime: '00:00', endTime: '23:59' }]
    render(<WeekView lessons={allDay} onEdit={() => {}} />)
    expect(screen.getByText('Весь день')).toBeInTheDocument()
  })
```

```tsx
// MonthView.test.tsx
  it('omits the time for an all-day event', () => {
    const allDay: Lesson[] = [
      { id: '10', type: 'once', title: 'Конференция', weekday: 4, startTime: '00:00', endTime: '23:59', date: '2026-08-06', allDay: true },
    ]
    renderView(allDay)
    expect(screen.getByText('Конференция')).toBeInTheDocument()
    expect(screen.queryByText('00:00')).not.toBeInTheDocument()
  })
```

```tsx
// DashboardPage.test.tsx
  it('shows «Весь день» for an all-day event', () => {
    const now = new Date()
    useStore.setState({
      lessons: [
        { id: 'a1', type: 'once', weekday: now.getDay(), startTime: '00:00', endTime: '23:59', date: toISODate(now), title: 'Конференция', allDay: true },
      ],
    })
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(screen.getByText('Весь день')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/components/schedule src/pages/DashboardPage.test.tsx`
Expected: FAIL — время показывается как `00:00 – 23:59`.

- [ ] **Step 3: Реализовать**

```tsx
// LessonCard.tsx — вместо startTime/endTime
        <span className={`mt-0.5 block text-sm ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>
          {lessonTimeLabel(lesson)}
          {lesson.location && ` · ${lesson.location}`}
        </span>
```

```tsx
// WeekView.tsx — вместо интервала
      <span className={`block text-[11px] ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{lessonTimeLabel(l)}</span>
```

```tsx
// MonthView.tsx — время только для событий со временем
      {!l.allDay && <span className={`text-[10px] ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{l.startTime}</span>}
```

```tsx
// TodayScheduleCard.tsx — вместо startTime
      <span className={`shrink-0 text-xs ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{lessonTimeLabel(l)}</span>
```

```tsx
// DayView.tsx — пустое состояние
      <p className="...">Событий нет</p>
```

Во всех файлах добавить `import { lessonTimeLabel } from '../../lib/date'` (или дополнить существующий импорт из `date`).

- [ ] **Step 4: Прогнать тесты видов**

Run: `npx vitest run src/components/schedule src/pages/DashboardPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/components/schedule src/components/dashboard/TodayScheduleCard.tsx src/pages/DashboardPage.test.tsx
git commit -m "feat: show «Весь день» for all-day events"
```

---

### Task 7: Полная проверка

- [ ] **Step 1: Типы и тесты фронтенда**

Run: `npx tsc -b && npx vitest run`
Expected: 0 ошибок, все тесты зелёные.

- [ ] **Step 2: Сборка фронтенда**

Run: `npm run build`
Expected: `vite build` успешен.

- [ ] **Step 3: Типы и тесты бэкенда**

Run: `cd backend && npx tsc --noEmit && npm test`
Expected: 0 ошибок, 15 файлов / 131 тест зелёные.

- [ ] **Step 4: Чистое дерево**

Run: `git status --short`
Expected: пусто.
