import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PomodoroDurationInput from './PomodoroDurationInput'

function setup(overrides: Partial<{ min: number; max: number; value: number }> = {}) {
  const onCommit = vi.fn()
  const props = { label: 'Работа (минут)', min: 1, max: 120, value: 25, onCommit, ...overrides }
  const { rerender } = render(<PomodoroDurationInput {...props} />)
  const input = screen.getByLabelText('Работа (минут)') as HTMLInputElement
  return { onCommit, input, rerender, props }
}

describe('PomodoroDurationInput', () => {
  it('does not commit while typing', async () => {
    const user = userEvent.setup()
    const { onCommit, input } = setup()
    await user.clear(input)
    await user.type(input, '50')
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('50')
  })

  it('clamps to the max on blur and commits the clamped value', async () => {
    const user = userEvent.setup()
    const { onCommit, input } = setup({ max: 120 })
    await user.clear(input)
    await user.type(input, '200')
    await user.tab()
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(120)
    expect(input.value).toBe('120')
  })

  it('restores the committed value and does not commit when the draft is empty', async () => {
    const user = userEvent.setup()
    const { onCommit, input } = setup()
    await user.clear(input)
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('25')
  })

  it('commits on Enter', async () => {
    const user = userEvent.setup()
    const { onCommit, input } = setup()
    await user.clear(input)
    await user.type(input, '50{Enter}')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(50)
  })

  it('does not commit when the value is unchanged', async () => {
    const user = userEvent.setup()
    const { onCommit, input } = setup({ value: 30 })
    await user.click(input)
    await user.tab()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('syncs the draft when the committed value changes from outside', () => {
    const { input, rerender, props } = setup({ value: 25 })
    expect(input.value).toBe('25')
    rerender(<PomodoroDurationInput {...props} value={10} />)
    expect(input.value).toBe('10')
  })
})
