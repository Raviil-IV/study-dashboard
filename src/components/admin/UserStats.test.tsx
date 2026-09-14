import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserStats from './UserStats'
import type { AdminUserStats } from '../../types/admin'

const stats: AdminUserStats = {
  profile: { id: 'u1', login: 'alice', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' },
  focus: { totalSessions: 2, totalMinutes: 50, minutes30d: 25 },
  tasks: { total: 1, done: 1, inProgress: 0, overdue: 0 },
  deadlines: { upcoming: 1, overdue: 0 },
  notes: { total: 1 },
  games: [],
  activity: Array.from({ length: 7 }, (_, i) => ({
    day: `2026-09-0${i + 1}`,
    visits: i === 6 ? 1 : 0,
    tasksDone: 0,
  })),
  content: {
    tasks: [
      {
        id: 't1',
        title: 'Купить книги',
        subject: 'Математика',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-10-01',
        createdAt: '2026-09-01T10:00:00.000Z',
        completedAt: null,
      },
    ],
    deadlines: [{ id: 'd1', title: 'Экзамен по физике', type: 'exam', subject: 'Физика', date: '2026-10-15', time: '10:00' }],
    notes: [{ id: 'n1', title: 'Идеи для проекта', subject: null, content: 'Текст заметки', tags: ['важное'], updatedAt: '2026-09-01T10:00:00.000Z' }],
    lessons: [
      { id: 'l1', title: 'Алгебра', type: 'weekly', weekday: 1, startTime: '09:00', endTime: '10:30', location: '101', color: 'blue' },
    ],
    focus: [{ id: 'f1', label: 'Сессия', subject: null, startedAt: '2026-09-01T10:00:00.000Z', durationMinutes: 25, completed: true }],
  },
}

describe('UserStats', () => {
  it('renders the overview with profile and stats', () => {
    render(<UserStats stats={stats} onBack={() => {}} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Задач выполнено')).toBeInTheDocument()
    expect(screen.getByText('Активность за 7 дней')).toBeInTheDocument()
  })

  it('shows the user content per tab', async () => {
    const user = userEvent.setup()
    render(<UserStats stats={stats} onBack={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Задачи' }))
    expect(screen.getByText('Купить книги')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Дедлайны' }))
    expect(screen.getByText('Экзамен по физике')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Заметки' }))
    expect(screen.getByText('Идеи для проекта')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Уроки' }))
    expect(screen.getByText('Алгебра')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Фокус' }))
    expect(screen.getByText('Сессия')).toBeInTheDocument()
  })

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<UserStats stats={stats} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: '← Назад' }))
    expect(onBack).toHaveBeenCalled()
  })
})