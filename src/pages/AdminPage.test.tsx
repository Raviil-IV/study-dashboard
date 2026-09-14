import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from './AdminPage'
import { api } from '../lib/api'
import type { AdminStats, AdminUser } from '../types/admin'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const stats: AdminStats = {
  totalUsers: 2,
  newUsers7d: 1,
  newUsers30d: 2,
  activeUsers7d: 1,
  focusMinutes7d: 25,
  focusMinutes30d: 50,
  avgSessionMinutes: 25,
  tasksTotal: 5,
  tasksDone: 2,
  tasksDonePercent: 40,
  tasksOverdue: 1,
  deadlinesUpcoming7d: 2,
  deadlinesOverdue: 0,
  notesTotal: 3,
  notesPerUser: 1.5,
  trend: [],
}

const users: AdminUser[] = [
  { id: 'u1', login: 'boss', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z', taskCount: 3, visitCount: 5 },
  { id: 'u2', login: 'student', role: 'user', createdAt: '2026-02-01T00:00:00.000Z', taskCount: 1, visitCount: 0 },
]

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.patch).mockReset()
  vi.mocked(api.get).mockResolvedValueOnce(stats).mockResolvedValueOnce(users)
})

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  it('renders global stats cards', async () => {
    renderPage()
    expect(await screen.findByText('50')).toBeInTheDocument()
    expect(screen.getByText('Пользователей')).toBeInTheDocument()
  })

  it('switches to users tab and lists users', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Пользователи' }))
    expect(await screen.findByText('student')).toBeInTheDocument()
    expect(screen.getByText('boss')).toBeInTheDocument()
  })

  it('deletes a user after confirmation and removes them from the list', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ id: 'u2' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Пользователи' }))
    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[1])
    expect(api.delete).toHaveBeenCalledWith('/admin/users/u2')
    expect(screen.queryByText('student')).not.toBeInTheDocument()
    expect(screen.getByText('boss')).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
