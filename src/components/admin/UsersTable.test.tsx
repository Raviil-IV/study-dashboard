import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersTable from './UsersTable'
import type { AdminUser } from '../../types/admin'

const users: AdminUser[] = [
  { id: 'u1', login: 'boss', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z', taskCount: 3, sessionCount: 5 },
  { id: 'u2', login: 'student', role: 'user', createdAt: '2026-02-01T00:00:00.000Z', taskCount: 1, sessionCount: 0 },
]

describe('UsersTable', () => {
  it('calls onToggleRole when the role button is clicked', async () => {
    const onToggleRole = vi.fn()
    const user = userEvent.setup()
    render(<UsersTable users={users} onOpen={() => {}} onToggleRole={onToggleRole} />)
    await user.click(screen.getAllByRole('button', { name: /Сделать админом|Снять админа/ })[0])
    expect(onToggleRole).toHaveBeenCalledWith(users[0])
  })
})
