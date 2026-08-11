import Card from '../ui/Card'
import type { AdminStats } from '../../types/admin'

export default function StatsCards({ stats }: { stats: AdminStats }) {
  const items = [
    { label: 'Пользователей', value: stats.totalUsers },
    { label: 'Новых за 7 дней', value: stats.newUsers7d },
    { label: 'Активных за 30 дней', value: stats.activeUsers30d },
    { label: 'Фокус-минут за 30 дней', value: stats.focusMinutes30d },
    { label: 'Средняя сессия, мин', value: stats.avgSessionMinutes },
    { label: 'Задач выполнено, %', value: stats.tasksDonePercent },
    { label: 'Задач просрочено', value: stats.tasksOverdue },
    { label: 'Дедлайнов в ближайшие 7 дней', value: stats.deadlinesUpcoming7d },
    { label: 'Заметок', value: stats.notesTotal },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
        </Card>
      ))}
    </div>
  )
}
