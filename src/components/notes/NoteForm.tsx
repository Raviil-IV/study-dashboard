import { useState, type FormEvent } from 'react'
import type { Note } from '../../types'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'

export interface NoteFormValues {
  title: string
  subject: string
  content: string
  tags: string
}

export default function NoteForm({ initial, onSubmit, onCancel }: { initial?: Note; onSubmit: (values: NoteFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<NoteFormValues>(() =>
    initial
      ? { title: initial.title, subject: initial.subject ?? '', content: initial.content, tags: initial.tags.join(', ') }
      : { title: '', subject: '', content: '', tags: '' },
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите заголовок')
      return
    }
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Заголовок" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Тема заметки" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
        <Input label="Теги" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} placeholder="алгебра, формулы" />
      </div>
      <Textarea label="Содержимое" rows={6} value={values.content} onChange={(e) => setValues({ ...values, content: e.target.value })} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
