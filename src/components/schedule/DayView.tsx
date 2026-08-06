import type { Lesson } from '../../types'
import { isLessonNow, toISODate } from '../../lib/date'
import LessonCard from './LessonCard'

export default function DayView({ lessons, date, onEdit, onDelete }: { lessons: Lesson[]; date: Date; onEdit: (l: Lesson) => void; onDelete: (id: string) => void }) {
  const today = new Date()
  const dayLessons = lessons
    .filter((l) => l.weekday === date.getDay())
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium capitalize text-gray-500 dark:text-gray-400">
        {date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      {dayLessons.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">Занятий нет</p>
      ) : (
        dayLessons.map((l) => (
          <LessonCard
            key={l.id}
            lesson={l}
            isNow={toISODate(date) === toISODate(today) && isLessonNow(l)}
            onEdit={() => onEdit(l)}
            onDelete={() => onDelete(l.id)}
          />
        ))
      )}
    </div>
  )
}
