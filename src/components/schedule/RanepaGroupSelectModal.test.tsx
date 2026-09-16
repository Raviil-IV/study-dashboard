import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RanepaGroupSelectModal from './RanepaGroupSelectModal'
import type { RanepaGroupOption } from '../../types'

const GROUPS: RanepaGroupOption[] = [
  { rawGroup: 'БИ-3-24-04', count: 95, invalidCount: 1 },
  { rawGroup: 'БИ-3-24-03', count: 92, invalidCount: 0 },
  { rawGroup: 'БИ-3-24-03-04', count: 60, invalidCount: 0 },
]

function renderModal(onSave: (selected: string[]) => void = vi.fn(), initialSelection: string[] = []) {
  const onCancel = vi.fn()
  render(<RanepaGroupSelectModal groups={GROUPS} initialSelection={initialSelection} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel }
}

describe('RanepaGroupSelectModal', () => {
  it('lists every raw group variant with lesson counts', () => {
    renderModal()

    expect(screen.getByRole('checkbox', { name: 'БИ-3-24-04' })).toBeInTheDocument()
    expect(screen.getByText(/96 занятий/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'БИ-3-24-03' })).toBeInTheDocument()
    expect(screen.getByText(/92 занятия/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'БИ-3-24-03-04' })).toBeInTheDocument()
    expect(screen.getByText(/60 занятий/)).toBeInTheDocument()
  })

  it('disables save when nothing is selected', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
  })

  it('saves the checked groups', async () => {
    const user = userEvent.setup()
    const { onSave } = renderModal()

    await user.click(screen.getByRole('checkbox', { name: 'БИ-3-24-04' }))
    await user.click(screen.getByRole('checkbox', { name: 'БИ-3-24-03-04' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(onSave).toHaveBeenCalledWith(['БИ-3-24-04', 'БИ-3-24-03-04'])
  })

  it('prechecks the initial selection', () => {
    renderModal(vi.fn(), ['БИ-3-24-03'])

    expect(screen.getByRole('checkbox', { name: 'БИ-3-24-03' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'БИ-3-24-04' })).not.toBeChecked()
  })

  it('cancels without saving', async () => {
    const user = userEvent.setup()
    const { onSave, onCancel } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
