import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }))
vi.mock('../store/useAuth', () => ({
  useAuth: () => ({ register: registerMock, status: 'guest' }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RegisterPage', () => {
  it('registers and redirects to the dashboard', async () => {
    registerMock.mockResolvedValue(undefined)
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.type(screen.getByLabelText('Повторите пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(registerMock).toHaveBeenCalledWith('a@b.dev', 'password123')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an error when passwords do not match', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.dev')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.type(screen.getByLabelText('Повторите пароль'), 'password124')
    await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })
})
