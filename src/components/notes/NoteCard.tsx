import type { Note } from '../../types'
import IconButton from '../ui/IconButton'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onOpen,
}: {
  note: Note
  onEdit: () => void
  onDelete: () => void
  onTogglePin: () => void
  onOpen: () => void
}) {
  return (
    <li
      onClick={onOpen}
      className={`flex cursor-pointer flex-col rounded-xl bg-white p-4 shadow-sm ring-1 transition-colors hover:ring-indigo-300 dark:bg-gray-900 dark:hover:ring-indigo-700 ${note.pinned ? 'ring-indigo-400 dark:ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{note.title}</h3>
        <div className="flex shrink-0 gap-1">
          <IconButton name="pin" label="Закрепить" onClick={(e) => { e.stopPropagation(); onTogglePin() }} />
          <IconButton name="edit" label="Редактировать" onClick={(e) => { e.stopPropagation(); onEdit() }} />
          <IconButton name="trash" label="Удалить" onClick={(e) => { e.stopPropagation(); onDelete() }} />
        </div>
      </div>
      <p className="mb-3 line-clamp-4 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{note.content || '—'}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        {note.subject && <span>{note.subject}</span>}
        {note.tags.map((t) => (
          <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">#{t}</span>
        ))}
        <span className="ml-auto">{formatShortDate(note.updatedAt)}</span>
      </div>
    </li>
  )
}
