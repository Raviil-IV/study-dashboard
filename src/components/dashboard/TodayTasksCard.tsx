import { Link } from 'react-router-dom'
import type { Task } from '../../types'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

export default function TodayTasksCard({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => t.status !== 'done')
  return (
    <Card title="Задачи на сегодня" action={<Link to="/tasks" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Все задачи →</Link>}>
      {active.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">На сегодня всё свободно 🎉</p>
      ) : (
        <ul className="space-y-2">
          {active.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
              <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{t.title}</span>
              {t.subject && <Badge>{t.subject}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
