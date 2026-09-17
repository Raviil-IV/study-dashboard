import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { useStore } from '../store/useStore'
import { toISODate } from '../lib/date'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [
      { id: '1', title: 'Решить задачи', priority: 'high', status: 'todo', createdAt: new Date().toISOString(), dueDate: iso(0) },
      { id: '2', title: 'Сделано дело', priority: 'low', status: 'done', createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ],
    deadlines: [{ id: '1', title: 'Экзамен по физике', type: 'exam', subject: 'Физика', date: iso(2), createdAt: new Date().toISOString() }],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('DashboardPage', () => {
  it('shows today tasks and upcoming deadlines', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Решить задачи')).toBeInTheDocument()
    expect(screen.getByText('Экзамен по физике')).toBeInTheDocument()
  })
  it('shows greeting', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Сегодня .+,/)).toBeInTheDocument()
  })

  it('shows only lessons of the current date in the schedule card', () => {
    const now = new Date()
    useStore.setState({
      lessons: [
        { id: 't1', type: 'once', weekday: now.getDay(), startTime: '09:00', endTime: '10:30', date: toISODate(now), title: 'Сегодняшняя пара' },
        { id: 't2', type: 'once', weekday: now.getDay(), startTime: '09:00', endTime: '10:30', date: iso(7), title: 'Пара через неделю' },
        { id: 't3', type: 'weekly', weekday: now.getDay(), startTime: '11:00', endTime: '12:30', title: 'Регулярная пара' },
      ],
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Сегодняшняя пара')).toBeInTheDocument()
    expect(screen.getByText('Регулярная пара')).toBeInTheDocument()
    expect(screen.queryByText('Пара через неделю')).not.toBeInTheDocument()
  })
})
