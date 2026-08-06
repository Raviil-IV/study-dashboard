import { Link } from 'react-router-dom'
import type { Deadline } from '../../types'
import { daysUntil } from '../../lib/date'
import Card from '../ui/Card'

export default function UpcomingDeadlinesCard({ deadlines }: { deadlines: Deadline[] }) {
  const upcoming = deadlines
    .filter((d) => daysUntil(d.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  return (
    <Card title="Ближайшие дедлайны" action={<Link to="/deadlines" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Все →</Link>}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Дедлайнов нет</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((d) => {
            const days = daysUntil(d.date)
            const color = days <= 2 ? 'text-red-600 dark:text-red-400' : days <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
            return (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{d.title}</span>
                <span className={`shrink-0 text-xs font-medium ${color}`}>{days === 0 ? 'сегодня' : `${days} дн.`}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
