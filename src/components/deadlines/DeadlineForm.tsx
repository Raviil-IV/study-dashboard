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
