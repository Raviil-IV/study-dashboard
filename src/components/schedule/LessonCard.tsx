import type { Lesson } from '../../types'
import { COLOR_CLASSES } from '../../lib/constants'
import IconButton from '../ui/IconButton'

export default function LessonCard({ lesson, isNow, onEdit, onDelete }: { lesson: Lesson; isNow: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {lesson.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_CLASSES[lesson.color]?.dot ?? 'bg-gray-400'}`} />}
          <span className="font-medium text-gray-900 dark:text-gray-100">{lesson.title}</span>
          {isNow && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
        </div>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {lesson.startTime} – {lesson.endTime}
          {lesson.location && ` · ${lesson.location}`}
        </p>
        {lesson.note && <p className="text-xs text-gray-400 dark:text-gray-500">{lesson.note}</p>}
      </div>
      <IconButton name="edit" label="Редактировать" onClick={onEdit} />
      <IconButton name="trash" label="Удалить" onClick={onDelete} />
    </div>
  )
}
