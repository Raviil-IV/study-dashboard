import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminRoute from './AdminRoute'
import { useAuth } from '../../store/useAuth'

beforeEach(() => {
  useAuth.setState({ user: null, status: 'authed' })
})

describe('AdminRoute', () => {
  it('renders children for an admin', () => {
    useAuth.setState({ user: { id: 'u1', login: 'boss', role: 'admin' }, status: 'authed' })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin panel</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Admin panel')).toBeInTheDocument()
  })

  it('redirects a regular user to the dashboard', () => {
    useAuth.setState({ user: { id: 'u2', login: 'user', role: 'user' }, status: 'authed' })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin panel</div>
              </AdminRoute>
            }
          />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument()
  })
})
