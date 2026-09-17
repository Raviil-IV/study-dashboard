import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { daysUntil, isLessonOnDate, isToday } from '../lib/date'
import { WEEKDAYS } from '../lib/constants'
import StatsBar from '../components/dashboard/StatsBar'
import TodayTasksCard from '../components/dashboard/TodayTasksCard'
import UpcomingDeadlinesCard from '../components/dashboard/UpcomingDeadlinesCard'
import TodayScheduleCard from '../components/dashboard/TodayScheduleCard'
import FocusQuickStartCard from '../components/dashboard/FocusQuickStartCard'

export default function DashboardPage() {
  const tasks = useStore((s) => s.tasks)
  const deadlines = useStore((s) => s.deadlines)
  const lessons = useStore((s) => s.lessons)
  const focusSessions = useStore((s) => s.focusSessions)

  const now = new Date()
  const weekdayName = WEEKDAYS[now.getDay()]

  const stats = useMemo(() => {
    const tasksToday = tasks.filter((t) => t.status !== 'done' && t.dueDate && isToday(t.dueDate)).length
    const lessonsToday = lessons.filter((l) => isLessonOnDate(l, now)).length
    const deadlinesSoon = deadlines.filter((d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 7).length
    const doneToday = focusSessions.filter((s) => s.completed).length
    return { tasksToday, lessonsToday, deadlinesSoon, doneToday }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, deadlines, lessons, focusSessions])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Привет! 👋</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Сегодня {weekdayName.toLowerCase()}, {now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </p>
      </header>
      <div className="space-y-4">
        <StatsBar tasksToday={stats.tasksToday} lessonsToday={stats.lessonsToday} deadlinesSoon={stats.deadlinesSoon} doneToday={stats.doneToday} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayTasksCard tasks={tasks.filter((t) => t.dueDate && isToday(t.dueDate))} />
          <UpcomingDeadlinesCard deadlines={deadlines} />
          <TodayScheduleCard lessons={lessons} />
          <FocusQuickStartCard />
        </div>
      </div>
    </div>
  )
}
