import { Link } from 'react-router-dom'
import type { Lesson } from '../../types'
import { isLessonNow, isLessonOnDate, lessonTimeLabel } from '../../lib/date'
import { COLOR_CLASSES } from '../../lib/constants'
import { importedLessonClasses } from '../../lib/lessonStyle'
import Card from '../ui/Card'

export default function TodayScheduleCard({ lessons }: { lessons: Lesson[] }) {
  const today = new Date()
  const todays = lessons.filter((l) => isLessonOnDate(l, today)).sort((a, b) => a.startTime.localeCompare(b.startTime))
  return (
    <Card title="Расписание на сегодня" action={<Link to="/schedule" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Всё расписание →</Link>}>
      {todays.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Сегодня занятий нет</p>
      ) : (
        <ul className="space-y-2">
          {todays.map((l) => {
            const style = importedLessonClasses(l)
            return (
              <li key={l.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${style ? style.surfaceStatic : ''}`}>
                {!style && l.color && <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_CLASSES[l.color]?.dot ?? 'bg-gray-400'}`} />}
                <span className={`min-w-0 flex-1 truncate ${style ? style.title : 'text-gray-800 dark:text-gray-200'}`}>{l.title}</span>
                <span className={`shrink-0 text-xs ${style ? style.meta : 'text-gray-500 dark:text-gray-400'}`}>{lessonTimeLabel(l)}</span>
                {isLessonNow(l) && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">сейчас</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
