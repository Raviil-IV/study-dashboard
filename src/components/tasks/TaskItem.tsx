import type { Task } from '../../types'
import { daysUntil } from '../../lib/date'
import Badge from '../ui/Badge'
import IconButton from '../ui/IconButton'

export default function TaskItem({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const done = task.status === 'done'
  const overdue = !done && task.dueDate && daysUntil(task.dueDate) < 0
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <input
        type="checkbox"
        aria-label={task.title}
        checked={done}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.subject && <span>{task.subject}</span>}
          <Badge>{task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}</Badge>
          {overdue && <span className="text-red-600 dark:text-red-400">просрочено на {-daysUntil(task.dueDate!)} дн.</span>}
          {task.dueDate && !overdue && !done && <span>{daysUntil(task.dueDate)} дн. осталось</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton name="edit" label="Редактировать" onClick={onEdit} />
        <IconButton name="trash" label="Удалить" onClick={onDelete} />
      </div>
    </li>
  )
}
