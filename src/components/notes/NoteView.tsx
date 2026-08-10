import Modal from '../ui/Modal'
import Button from '../ui/Button'
import MarkdownView from '../ui/MarkdownView'
import type { Note } from '../../types'

export default function NoteView({ note, onEdit, onClose }: { note: Note; onEdit: () => void; onClose: () => void }) {
  return (
    <Modal open title={note.title} onClose={onClose} size="3xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          {note.subject && <span>{note.subject}</span>}
          {note.tags.map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">#{t}</span>
          ))}
        </div>
        {note.content ? (
          <MarkdownView content={note.content} />
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button type="button" onClick={onEdit}>Редактировать</Button>
        </div>
      </div>
    </Modal>
  )
}
