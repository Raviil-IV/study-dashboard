import type { Deadline } from '../../types'
import { daysUntil, formatDate } from '../../lib/date'
import { DEADLINE_TYPES } from '../../lib/constants'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'

function urgencyBadge(days: number): { label: string; className: string } {
  if (days <= 0) return { label: 'Сегодня', className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
  if (days <= 2) return { label: `${days} дн.`, className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
  if (days <= 7) return { label: `${days} дн.`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' }
  return { label: `${days} дн.`, className: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' }
}

export default function DeadlineItem({ deadline, onEdit, onDelete }: { deadline: Deadline; onEdit: () => void; onDelete: () => void }) {
  const days = daysUntil(deadline.date)
  const urgent = urgencyBadge(days)
  const typeLabel = DEADLINE_TYPES.find((t) => t.value === deadline.type)?.label ?? deadline.type
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">{deadline.title}</p>
          <Badge>{typeLabel}</Badge>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgent.className}`}>{urgent.label}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDate(deadline.date)}
          {deadline.time && ` · ${deadline.time}`}
          {deadline.subject && ` · ${deadline.subject}`}
        </p>
        {deadline.note && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{deadline.note}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton name="edit" label="Редактировать" onClick={onEdit} />
        <IconButton name="trash" label="Удалить" onClick={onDelete} />
      </div>
    </li>
  )
}
