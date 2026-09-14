import { useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ActivityChart from './ActivityChart'
import RoleBadge from './RoleBadge'
import { DEADLINE_TYPES, TASK_PRIORITIES, TASK_STATUSES, WEEKDAYS } from '../../lib/constants'
import type { AdminUserStats } from '../../types/admin'

type TabKey = 'overview' | 'tasks' | 'deadlines' | 'notes' | 'lessons' | 'focus' | 'games'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Сводка' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'deadlines', label: 'Дедлайны' },
  { key: 'notes', label: 'Заметки' },
  { key: 'lessons', label: 'Уроки' },
  { key: 'focus', label: 'Фокус' },
  { key: 'games', label: 'Игры' },
]

const GAME_LABELS: Record<string, string> = { memory: 'Память', snake: 'Змейка', minesweeper: 'Сапёр' }
const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' }

function Row({ title, meta }: { title: string; meta?: string }) {
  return (
    <li className="border-t border-gray-100 first:border-t-0 dark:border-gray-800">
      <div className="py-2">
        <div className="font-medium text-gray-900 dark:text-gray-100">{title}</div>
        {meta && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{meta}</div>}
      </div>
    </li>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
}

export default function UserStats({ stats, onBack }: { stats: AdminUserStats; onBack: () => void }) {
  const [tab, setTab] = useState<TabKey>('overview')
  const s = stats
  const c = stats.content

  const priorityLabel = (v: string) => TASK_PRIORITIES.find((p) => p.value === v)?.label ?? v
  const statusLabel = (v: string) => TASK_STATUSES.find((x) => x.value === v)?.label ?? v
  const typeLabel = (v: string) => DEADLINE_TYPES.find((x) => x.value === v)?.label ?? v

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
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} size="sm" variant={tab === t.key ? 'primary' : 'secondary'} onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>
      {tab === 'overview' && (
        <>
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
          <Card title="Активность за 7 дней">
            <ActivityChart data={s.activity} />
          </Card>
        </>
      )}
      {tab === 'tasks' && (
        <Card title="Задачи">
          {c.tasks.length === 0 ? (
            <Empty label="Нет задач" />
          ) : (
            <ul>
              {c.tasks.map((t) => (
                <Row
                  key={t.id}
                  title={t.title}
                  meta={[t.subject, priorityLabel(t.priority), statusLabel(t.status), t.dueDate ? `до ${t.dueDate}` : undefined].filter(Boolean).join(' · ')}
                />
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'deadlines' && (
        <Card title="Дедлайны">
          {c.deadlines.length === 0 ? (
            <Empty label="Нет дедлайнов" />
          ) : (
            <ul>
              {c.deadlines.map((d) => (
                <Row
                  key={d.id}
                  title={d.title}
                  meta={[typeLabel(d.type), d.subject, d.date, d.time].filter(Boolean).join(' · ')}
                />
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'notes' && (
        <Card title="Заметки">
          {c.notes.length === 0 ? (
            <Empty label="Нет заметок" />
          ) : (
            <ul>
              {c.notes.map((n) => (
                <Row key={n.id} title={n.title} meta={[n.subject, ...n.tags].filter(Boolean).join(' · ')} />
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'lessons' && (
        <Card title="Уроки">
          {c.lessons.length === 0 ? (
            <Empty label="Нет занятий" />
          ) : (
            <ul>
              {c.lessons.map((l) => (
                <Row key={l.id} title={l.title} meta={[WEEKDAYS[l.weekday], `${l.startTime}–${l.endTime}`, l.location].filter(Boolean).join(' · ')} />
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'focus' && (
        <Card title="Фокус-сессии">
          {c.focus.length === 0 ? (
            <Empty label="Нет сессий" />
          ) : (
            <ul>
              {c.focus.map((f) => (
                <Row
                  key={f.id}
                  title={f.label ?? 'Без метки'}
                  meta={[f.subject, f.startedAt.slice(0, 10), `${f.durationMinutes} мин`, f.completed ? 'завершена' : 'прервана'].filter(Boolean).join(' · ')}
                />
              ))}
            </ul>
          )}
        </Card>
      )}
      {tab === 'games' && (
        <Card title="Рекорды в играх">
          {s.games.length === 0 ? (
            <Empty label="Нет рекордов" />
          ) : (
            <ul>
              {s.games.map((g) => (
                <Row
                  key={`${g.game}-${g.difficulty}`}
                  title={GAME_LABELS[g.game] ?? g.game}
                  meta={`${DIFFICULTY_LABELS[g.difficulty] ?? g.difficulty} · рекорд ${g.bestValue}`}
                />
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}