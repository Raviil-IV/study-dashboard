import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { useStore } from '../store/useStore'

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
})
