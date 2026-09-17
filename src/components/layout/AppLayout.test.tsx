import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import { useAuth } from '../../store/useAuth'
import { usePomodoroStore } from '../../store/usePomodoroStore'

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  useAuth.setState({ user: null, status: 'authed' })
  usePomodoroStore.getState().resetAll()
})

describe('AppLayout admin nav item', () => {
  it('shows the admin link for an admin user', () => {
    useAuth.setState({ user: { id: 'u1', login: 'boss', role: 'admin' }, status: 'authed' })
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('Админка').length).toBeGreaterThan(0)
  })

  it('hides the admin link for a regular user', () => {
    useAuth.setState({ user: { id: 'u2', login: 'user', role: 'user' }, status: 'authed' })
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Админка')).not.toBeInTheDocument()
  })

  it('shows the floating pomodoro widget while the timer is running', () => {
    usePomodoroStore.setState({ isRunning: true, mode: 'shortBreak', secondsLeft: 300 })
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.getByText('Короткий перерыв')).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('hides the floating pomodoro widget while the timer is not running', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    expect(screen.queryByText('05:00')).not.toBeInTheDocument()
  })
})
