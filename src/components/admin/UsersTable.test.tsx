import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersTable from './UsersTable'
import type { AdminUser } from '../../types/admin'

const users: AdminUser[] = [
  { id: 'u1', login: 'boss', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z', taskCount: 3, visitCount: 5 },
  { id: 'u2', login: 'student', role: 'user', createdAt: '2026-02-01T00:00:00.000Z', taskCount: 1, visitCount: 0 },
]

describe('UsersTable', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onToggleRole when the role button is clicked', async () => {
    const onToggleRole = vi.fn()
    const user = userEvent.setup()
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={onToggleRole} onDelete={() => {}} />)
    await user.click(screen.getAllByRole('button', { name: /Сделать админом|Снять админа/ })[0])
    expect(onToggleRole).toHaveBeenCalledWith(users[0])
  })

  it('shows the visit count column', () => {
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Заходов')).toBeInTheDocument()
    expect(screen.getAllByText('5')).toHaveLength(1)
  })

  it('calls onDelete after confirmation', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={() => {}} onDelete={onDelete} />)
    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[0])
    expect(window.confirm).toHaveBeenCalled()
    expect(onDelete).toHaveBeenCalledWith(users[0])
  })

  it('does not call onDelete when the confirmation is declined', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={() => {}} onDelete={onDelete} />)
    await user.click(screen.getAllByRole('button', { name: 'Удалить' })[0])
    expect(onDelete).not.toHaveBeenCalled()
  })
})