import { useState } from 'react'
import type { RanepaInvalidLesson } from '../../types'
import { pluralRu } from '../../lib/date'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function RanepaFixDatesModal({
  items,
  initialDates,
  onSave,
  onCancel,
}: {
  items: RanepaInvalidLesson[]
  initialDates: (string | undefined)[]
  onSave: (dates: (string | undefined)[]) => void
  onCancel: () => void
}) {
  const [dates, setDates] = useState<(string | undefined)[]>(() => items.map((_, i) => initialDates[i] ?? undefined))

  const unfixed = dates.filter((d) => !d).length

  return (
    <Modal open title="Исправить даты занятий" onClose={onCancel} size="3xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          На сайте вуза у этих занятий некорректные даты. Поставьте правильные — занятия попадут в расписание. Остальные
          будут пропущены.
        </p>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={`${item.title}-${i}`}
              className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800 dark:ring-gray-700"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.startTime}–{item.endTime}
                  {item.teacher ? ` · ${item.teacher}` : ''} · с сайта: {item.rawDay}
                  {item.rawMonth ? `.${item.rawMonth}` : ''}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                Дата
                <input
                  type="date"
                  value={dates[i] ?? ''}
                  onChange={(e) =>
                    setDates((prev) => {
                      const next = [...prev]
                      next[i] = e.target.value || undefined
                      return next
                    })
                  }
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Без даты не будут импортированы: {unfixed} {pluralRu(unfixed, 'занятие', 'занятия', 'занятий')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={() => onSave(dates)}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  )
}
