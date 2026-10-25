import { useState, type FormEvent } from 'react'
import type { Lesson } from '../../types'
import { WEEKDAYS, SUBJECT_COLORS, COLOR_NAMES } from '../../lib/constants'
import { parseLocalDate } from '../../lib/date'
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

export default function LessonForm({ initial, onSubmit, onCancel, onDelete }: { initial?: Lesson; onSubmit: (values: LessonFormValues) => void; onCancel: () => void; onDelete?: () => void }) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Тип события</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="lessonType" checked={values.type === 'weekly'} onChange={() => setValues({ ...values, type: 'weekly' })} />
            Регулярное (каждую неделю)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="radio" name="lessonType" checked={values.type === 'once'} onChange={() => setValues({ ...values, type: 'once' })} />
            На конкретную дату
          </label>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={values.allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
        Весь день
      </label>
      <Input label="Название" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Например: Математика" />
      <div className="grid grid-cols-2 gap-4">
        {values.type === 'once' ? (
          <Input label="Дата" type="date" value={values.date} onChange={(e) => setValues({ ...values, date: e.target.value })} />
        ) : (
          <Select label="День недели" value={String(values.weekday)} onChange={(e) => setValues({ ...values, weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((day, i) => (
              <option key={i} value={i}>{day}</option>
            ))}
          </Select>
        )}
        <Select label="Цвет" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })}>
          {SUBJECT_COLORS.map((c) => (
            <option key={c} value={c}>{COLOR_NAMES[c]}</option>
          ))}
        </Select>
      </div>
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
      <Input label="Кабинет / ссылка" value={values.location} onChange={(e) => setValues({ ...values, location: e.target.value })} placeholder="Каб. 201 или ссылка" />
      <Input label="Заметка" value={values.note} onChange={(e) => setValues({ ...values, note: e.target.value })} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
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
    </form>
  )
}
