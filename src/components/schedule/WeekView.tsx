import type { Lesson } from '../../types'
import { toISODate } from '../../lib/date'
import { WEEKDAYS_SHORT, COLOR_CLASSES } from '../../lib/constants'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function WeekView({ lessons }: { lessons: Lesson[] }) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {WEEK_ORDER.map((weekday, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const isToday = toISODate(date) === toISODate(today)
        const dayLessons = lessons
          .filter((l) => l.weekday === weekday)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        return (
          <div
            key={weekday}
            className={`rounded-xl bg-white p-3 shadow-sm ring-1 dark:bg-gray-900 ${
              isToday ? 'ring-2 ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'
            }`}
          >
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <span>{WEEKDAYS_SHORT[weekday]}</span> {date.getDate()}
            </p>
            <div className="space-y-1.5">
              {dayLessons.length === 0 ? (
                <p className="text-xs text-gray-400">—</p>
              ) : (
                dayLessons.map((l) => (
                  <div key={l.id} className="rounded-md bg-gray-50 px-2 py-1.5 dark:bg-gray-800">
                    <div className="flex items-center gap-1.5">
                      {l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{l.title}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{l.startTime}–{l.endTime}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
