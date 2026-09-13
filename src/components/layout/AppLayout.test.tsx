import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'
import { useAuth } from '../../store/useAuth'

beforeEach(() => {
  useAuth.setState({ user: null, status: 'authed' })
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
})
