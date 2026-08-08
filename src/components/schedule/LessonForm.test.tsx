import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LessonForm from './LessonForm'

const baseProps = {
  initial: undefined,
  onSubmit: () => {},
  onCancel: () => {},
}

describe('LessonForm', () => {
  it('shows no delete button when onDelete is not provided', () => {
    render(<LessonForm {...baseProps} />)
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('shows the delete button and fires onDelete when editing', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<LessonForm {...baseProps} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
