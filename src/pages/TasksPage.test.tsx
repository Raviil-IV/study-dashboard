import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TasksPage from './TasksPage'
import { useStore } from '../store/useStore'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

const base = {
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TasksPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  const now = new Date().toISOString()
  useStore.setState({
    ...base,
    tasks: [
      { id: '1', title: 'Решить задачи', subject: 'Математика', priority: 'high', status: 'todo', createdAt: now },
      { id: '2', title: 'Прочитать главу', subject: 'История', priority: 'low', status: 'done', createdAt: now, completedAt: now },
    ],
  })
})

describe('TasksPage', () => {
  it('shows tasks with status filters', () => {
    renderPage()
    expect(screen.getByText('Решить задачи')).toBeInTheDocument()
    expect(screen.getByText('Прочитать главу')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выполнено' })).toBeInTheDocument()
  })

  it('adds a task', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить задачу' }))
    await user.type(screen.getByLabelText('Название'), 'Написать сочинение')
    await user.selectOptions(screen.getByLabelText('Приоритет'), 'high')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().tasks).toHaveLength(3)
    expect(screen.getByText('Написать сочинение')).toBeInTheDocument()
  })

  it('toggles a task to done and back', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Решить задачи' }))
    expect(useStore.getState().tasks.find((t) => t.id === '1')?.status).toBe('done')
    await user.click(screen.getByRole('checkbox', { name: 'Решить задачи' }))
    expect(useStore.getState().tasks.find((t) => t.id === '1')?.status).toBe('todo')
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Выполнено' }))
    expect(screen.queryByText('Решить задачи')).not.toBeInTheDocument()
    expect(screen.getByText('Прочитать главу')).toBeInTheDocument()
  })
})
