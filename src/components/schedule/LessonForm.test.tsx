import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('does not constrain the one-off date input to future dates', async () => {
    const user = userEvent.setup()
    render(<LessonForm {...baseProps} />)
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    expect(screen.getByLabelText('Дата')).not.toHaveAttribute('min')
  })

  it('saves a one-off lesson with a past date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LessonForm {...baseProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('radio', { name: 'На конкретную дату' }))
    await user.type(screen.getByLabelText('Название'), 'История')
    fireEvent.change(screen.getByLabelText('Дата'), { target: { value: '2020-03-15' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'История',
      type: 'once',
      date: '2020-03-15',
      weekday: 0, // 2020-03-15 was a Sunday, parsed locally
    })
  })
})
