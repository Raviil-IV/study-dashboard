import { useEffect, useState, type FormEvent } from 'react'
import type { Note } from '../../types'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import Tabs from '../ui/Tabs'
import MarkdownView from '../ui/MarkdownView'

export interface NoteFormValues {
  title: string
  subject: string
  content: string
  tags: string
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function NoteForm({ initial, onSubmit, onCancel }: { initial?: Note; onSubmit: (values: NoteFormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<NoteFormValues>(() =>
    initial
      ? { title: initial.title, subject: initial.subject ?? '', content: initial.content, tags: initial.tags.join(', ') }
      : { title: '', subject: '', content: '', tags: '' },
  )
  const [error, setError] = useState('')
  const [tab, setTab] = useState('write')
  const isDesktop = useIsDesktop()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) {
      setError('Введите заголовок')
      return
    }
    onSubmit(values)
  }

  const editor = (
    <Textarea
      label="Содержимое"
      rows={16}
      value={values.content}
      onChange={(e) => setValues({ ...values, content: e.target.value })}
      className="min-h-[420px] font-mono"
    />
  )

  const preview = (
    <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <MarkdownView content={values.content} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Заголовок" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} placeholder="Тема заметки" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Предмет" value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} placeholder="Математика" />
        <Input label="Теги" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} placeholder="алгебра, формулы" />
      </div>
      {isDesktop ? (
        <div className="grid grid-cols-2 gap-4">
          {editor}
          {preview}
        </div>
      ) : (
        <div>
          <Tabs
            tabs={[
              { value: 'write', label: 'Написать' },
              { value: 'preview', label: 'Предпросмотр' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-3">{tab === 'write' ? editor : preview}</div>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
