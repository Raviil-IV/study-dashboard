import type { Lesson } from '../../types'
import { COLOR_CLASSES } from '../../lib/constants'

export default function LessonCard({ lesson, isNow, onEdit }: { lesson: Lesson; isNow: boolean; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:ring-gray-800 dark:hover:bg-gray-800"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {lesson.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_CLASSES[lesson.color]?.dot ?? 'bg-gray-400'}`} />}
          <span className="font-medium text-gray-900 dark:text-gray-100">{lesson.title}</span>
          {isNow && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
        </span>
        <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
          {lesson.startTime} – {lesson.endTime}
          {lesson.location && ` · ${lesson.location}`}
        </span>
        {lesson.note && <span className="block text-xs text-gray-400 dark:text-gray-500">{lesson.note}</span>}
      </span>
    </button>
  )
}
