import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Note } from '../types'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import NoteForm, { type NoteFormValues } from '../components/notes/NoteForm'
import NoteCard from '../components/notes/NoteCard'

export default function NotesPage() {
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const updateNote = useStore((s) => s.updateNote)
  const removeNote = useStore((s) => s.removeNote)
  const togglePinNote = useStore((s) => s.togglePinNote)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Note | undefined>()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = notes.filter(
      (n) =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [notes, query])

  const handleSubmit = (values: NoteFormValues) => {
    const payload = { ...values, pinned: false, tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean) }
    if (editing) {
      updateNote(editing.id, payload)
    } else {
      addNote(payload)
    }
    setModalOpen(false)
  }
  const handleDelete = (id: string) => {
    if (window.confirm('Удалить заметку?')) {
      removeNote(id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Заметки"
        subtitle="Конспекты и идеи под рукой"
        action={<Button onClick={() => { setEditing(undefined); setModalOpen(true) }}>Добавить заметку</Button>}
      />
      <div className="mb-4 max-w-md">
        <Input placeholder="Поиск по заметкам…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="📝" title={query ? 'Ничего не найдено' : 'Пока нет заметок'} hint="Добавь первую заметку" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={() => { setEditing(n); setModalOpen(true) }}
              onDelete={() => handleDelete(n.id)}
              onTogglePin={() => togglePinNote(n.id)}
            />
          ))}
        </ul>
      )}
      <Modal open={modalOpen} title={editing ? 'Редактировать заметку' : 'Новая заметка'} onClose={() => setModalOpen(false)}>
        <NoteForm key={editing?.id ?? 'new'} initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
