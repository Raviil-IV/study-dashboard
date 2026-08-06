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
