import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))
vi.mock('../store/useAuth', () => ({
  useAuth: () => ({ login: loginMock, status: 'guest' }),
}))

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  it('submits credentials and redirects to the dashboard', async () => {
    loginMock.mockResolvedValue(undefined)
    renderLogin()
    await userEvent.type(screen.getByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(loginMock).toHaveBeenCalledWith('alice', 'password123')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an inline error when login fails', async () => {
    loginMock.mockRejectedValue(new Error('Неверный логин или пароль'))
    renderLogin()
    await userEvent.type(screen.getByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()
  })
})
