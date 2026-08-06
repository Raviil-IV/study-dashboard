import Card from '../ui/Card'

export default function StatsBar({ tasksToday, lessonsToday, deadlinesSoon, doneToday }: { tasksToday: number; lessonsToday: number; deadlinesSoon: number; doneToday: number }) {
  const items = [
    { label: 'Задач на сегодня', value: tasksToday },
    { label: 'Занятий сегодня', value: lessonsToday },
    { label: 'Дедлайнов скоро', value: deadlinesSoon },
    { label: 'Выполнено', value: doneToday },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label}>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{it.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{it.label}</p>
        </Card>
      ))}
    </div>
  )
}
