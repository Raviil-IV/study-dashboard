import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChangePasswordModal from './ChangePasswordModal'
import type { AdminUser } from '../../types/admin'

const user: AdminUser = {
  id: 'u2',
  login: 'student',
  role: 'user',
  createdAt: '2026-02-01T00:00:00.000Z',
  taskCount: 1,
  visitCount: 0,
}

function renderModal(onSubmit = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(<ChangePasswordModal user={user} onSubmit={onSubmit} onClose={onClose} />)
  return { onSubmit, onClose }
}

async function fill(password: string, repeat: string) {
  const event = userEvent.setup()
  await event.type(screen.getByLabelText('Новый пароль'), password)
  await event.type(screen.getByLabelText('Повторите пароль'), repeat)
  await event.click(screen.getByRole('button', { name: 'Сохранить' }))
}

describe('ChangePasswordModal', () => {
  it('rejects a password shorter than 6 characters', async () => {
    const { onSubmit } = renderModal()
    await fill('123', '123')
    expect(screen.getByText('Пароль должен быть не короче 6 символов')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    const { onSubmit } = renderModal()
    await fill('password123', 'password124')
    expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the new password', async () => {
    const { onSubmit } = renderModal()
    await fill('newpassword123', 'newpassword123')
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('newpassword123'))
  })

  it('closes without submitting on cancel', async () => {
    const { onSubmit, onClose } = renderModal()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
