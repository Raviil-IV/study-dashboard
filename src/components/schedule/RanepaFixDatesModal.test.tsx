import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RanepaFixDatesModal from './RanepaFixDatesModal'
import type { RanepaInvalidLesson } from '../../types'

const ITEMS: RanepaInvalidLesson[] = [
  {
    title: 'Социология',
    startTime: '18:30',
    endTime: '21:20',
    type: 'ПЗ',
    teacher: 'доц. Киселев Н.Е.',
    rawDay: '310',
    rawMonth: '10',
    reason: 'malformed',
    rawGroup: 'БИ-3-24-04',
  },
  {
    title: 'Пара 29 февраля',
    startTime: '08:30',
    endTime: '11:20',
    rawDay: '29',
    rawMonth: '02',
    reason: 'date_not_exists',
    rawGroup: 'БИ-3-24-04',
  },
]

function renderModal(onSave: (dates: (string | undefined)[]) => void = vi.fn(), initial: (string | undefined)[] = []) {
  const onCancel = vi.fn()
  render(<RanepaFixDatesModal items={ITEMS} initialDates={initial} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel }
}

describe('RanepaFixDatesModal', () => {
  it('shows each broken lesson with its raw date and a date input', () => {
    renderModal()

    expect(screen.getByText('Социология')).toBeInTheDocument()
    expect(screen.getByText(/18:30–21:20/)).toBeInTheDocument()
    expect(screen.getByText(/с сайта: 310\.10/)).toBeInTheDocument()
    expect(screen.getByText('Пара 29 февраля')).toBeInTheDocument()
    expect(screen.getByText(/с сайта: 29\.02/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/дата/i)).toHaveLength(2)
  })

  it('counts lessons left without a date', async () => {
    renderModal()

    expect(screen.getByText(/не будут импортированы: 2/)).toBeInTheDocument()

    fireChangeDate(0, '2026-10-31')

    expect(await screen.findByText(/не будут импортированы: 1/)).toBeInTheDocument()
  })

  it('saves only the dates the user filled in', async () => {
    const user = userEvent.setup()
    const { onSave } = renderModal()

    fireChangeDate(0, '2026-10-31')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(onSave).toHaveBeenCalledWith(['2026-10-31', undefined])
  })

  it('keeps previously saved dates when reopened', () => {
    renderModal(vi.fn(), ['2026-10-31', undefined])

    const inputs = screen.getAllByLabelText(/дата/i) as HTMLInputElement[]
    expect(inputs[0].value).toBe('2026-10-31')
    expect(inputs[1].value).toBe('')
  })

  it('cancels without saving', async () => {
    const user = userEvent.setup()
    const { onSave, onCancel } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})

async function fireChangeDate(index: number, value: string) {
  const inputs = screen.getAllByLabelText(/дата/i)
  fireEvent.change(inputs[index], { target: { value } })
}
