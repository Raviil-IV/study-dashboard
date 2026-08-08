import { useState } from 'react'
import type { Lesson } from '../../types'
import { getMonthGrid, toISODate } from '../../lib/date'
import { WEEKDAYS_SHORT, COLOR_CLASSES } from '../../lib/constants'
import IconButton from '../ui/IconButton'
import Button from '../ui/Button'

const MAX_LESSONS = 4

// getMonthGrid starts weeks on Monday; WEEKDAYS_SHORT is Sunday-first (indexed by getDay()).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default function MonthView({ lessons, onEdit, onDelete }: { lessons: Lesson[]; onEdit: (l: Lesson) => void; onDelete: (id: string) => void }) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const grid = getMonthGrid(cursor.getFullYear(), cursor.getMonth())
  const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()
  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  // Each weekly lesson is shown once per month — in the first in-month cell of its weekday.
  const firstDayByWeekday = new Map<number, string>()
  for (const day of grid) {
    const weekday = day.date.getDay()
    if (day.inMonth && !firstDayByWeekday.has(weekday)) {
      firstDayByWeekday.set(weekday, day.iso)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <IconButton name="chevron-left" label="Предыдущий месяц" onClick={goPrev} />
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">
            {cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="secondary" size="sm" onClick={goToday} disabled={isCurrentMonth}>
            Сегодня
          </Button>
        </div>
        <IconButton name="chevron-right" label="Следующий месяц" onClick={goNext} />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEK_ORDER.map((w) => (
          <div key={w} className="px-1 py-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
            {WEEKDAYS_SHORT[w]}
          </div>
        ))}
        {grid.map((day) => {
          const dayLessons = lessons
            .filter((l) =>
              l.type === 'once' ? l.date === day.iso : l.weekday === day.date.getDay() && firstDayByWeekday.get(l.weekday) === day.iso,
            )
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
          const visible = dayLessons.slice(0, MAX_LESSONS)
          const extra = dayLessons.length - visible.length
          const isToday = day.iso === toISODate(today)
          return (
            <div
              key={day.iso}
              className={`min-h-24 rounded-xl bg-white p-1.5 shadow-sm ring-1 dark:bg-gray-900 ${
                isToday ? 'ring-2 ring-indigo-500' : 'ring-gray-200 dark:ring-gray-800'
              } ${day.inMonth ? '' : 'opacity-40'}`}
            >
              <p className={`text-xs font-medium ${day.inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                {day.date.getDate()}
              </p>
              <div className="mt-1 space-y-1">
                {visible.length === 0 ? (
                  <p className="text-[10px] text-gray-400">—</p>
                ) : (
                  visible.map((l) => (
                    <div key={l.id} className="flex items-center gap-1 rounded bg-gray-50 px-1 py-0.5 dark:bg-gray-800">
                      {l.color && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{l.startTime}</span>
                      <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-800 dark:text-gray-200">{l.title}</p>
                      <span className="flex shrink-0">
                        <IconButton name="edit" label="Редактировать" onClick={() => onEdit(l)} />
                        <IconButton name="trash" label="Удалить" onClick={() => onDelete(l.id)} />
                      </span>
                    </div>
                  ))
                )}
                {extra > 0 && <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">+ ещё {extra}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
