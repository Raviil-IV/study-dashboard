import Button from '../ui/Button'
import Card from '../ui/Card'
import ActivityChart from './ActivityChart'
import RoleBadge from './RoleBadge'
import type { AdminUserStats } from '../../types/admin'

export default function UserStats({ stats, onBack }: { stats: AdminUserStats; onBack: () => void }) {
  const s = stats
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.profile.login}</h2>
          <RoleBadge role={s.profile.role} />
        </div>
        <Button size="sm" variant="secondary" onClick={onBack}>
          ← Назад
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-2xl font-bold">{s.focus.totalMinutes}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Минут фокуса всего</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.focus.minutes30d}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Минут за 30 дней</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.tasks.done}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Задач выполнено</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.tasks.overdue}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Задач просрочено</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.deadlines.upcoming}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Дедлайнов впереди</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold">{s.notes.total}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Заметок</div>
        </Card>
      </div>
      <Card title="Активность за 30 дней">
        <ActivityChart data={s.activity} />
      </Card>
    </div>
  )
}
