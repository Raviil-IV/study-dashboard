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
