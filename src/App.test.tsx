import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

vi.mock('./store/useAuth', () => ({
  useAuth: (selector: (s: { user: { id: string; login: string; role: string } | null; status: string }) => unknown) =>
    selector({ user: { id: 'u1', login: 'alice', role: 'admin' }, status: 'authed' }),
}))

test('renders nav labels for an authenticated user', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getAllByText('Study Dashboard').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Главная').length).toBeGreaterThan(0)
})
