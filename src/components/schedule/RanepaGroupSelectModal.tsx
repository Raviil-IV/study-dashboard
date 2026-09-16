import { useState } from 'react'
import type { RanepaGroupOption } from '../../types'
import { pluralRu } from '../../lib/date'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function RanepaGroupSelectModal({
  groups,
  initialSelection,
  onSave,
  onCancel,
}: {
  groups: RanepaGroupOption[]
  initialSelection: string[]
  onSave: (selected: string[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<string[]>(initialSelection)

  const toggle = (rawGroup: string) => {
    setSelected((prev) => (prev.includes(rawGroup) ? prev.filter((g) => g !== rawGroup) : [...prev, rawGroup]))
  }

  const totalSelected = selected.length

  return (
    <Modal open title="Выбор групп" onClose={onCancel} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          На странице расписание нескольких групп. Отметьте, занятия каких групп импортировать.
        </p>
        <ul className="space-y-2">
          {groups.map((g) => {
            const total = g.count + g.invalidCount
            return (
              <li key={g.rawGroup}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={g.rawGroup}
                      checked={selected.includes(g.rawGroup)}
                      onChange={() => toggle(g.rawGroup)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.rawGroup}</span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {total} {pluralRu(total, 'занятие', 'занятия', 'занятий')}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Выбрано: {totalSelected} {pluralRu(totalSelected, 'группа', 'группы', 'групп')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={() => onSave(selected)} disabled={totalSelected === 0}>
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  )
}
