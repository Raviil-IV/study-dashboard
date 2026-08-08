import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthView from './MonthView'
import type { Lesson } from '../../types'

const weekdayLessons: Lesson[] = [
  { id: '1', type: 'weekly', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30', color: 'blue' },
]
const onceLesson: Lesson[] = [
  { id: '2', type: 'once', title: 'Семинар', weekday: 5, startTime: '13:00', endTime: '14:00', date: '2026-08-07' },
]
const fiveInOneDay: Lesson[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  type: 'weekly' as const,
  title: `Занятие ${i + 1}`,
  weekday: 4,
  startTime: `${String(9 + i).padStart(2, '0')}:00`,
  endTime: '10:00',
}))

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // Thursday 2026-08-06
})
afterEach(() => {
  vi.useRealTimers()
})

function renderView(lessons: Lesson[] = []) {
  return render(<MonthView lessons={lessons} onEdit={() => {}} onDelete={() => {}} />)
}

describe('MonthView', () => {
  it('shows the current month title and weekday headers', () => {
    renderView()
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()
    expect(screen.getByText('Пн')).toBeInTheDocument()
    expect(screen.getByText('Вс')).toBeInTheDocument()
  })

  it('shows a weekly lesson in its weekday cell', () => {
    renderView(weekdayLessons)
    expect(screen.getByText('Математика')).toBeInTheDocument()
  })

  it('shows a one-off lesson only on its date', () => {
    renderView(onceLesson)
    expect(screen.getByText('Семинар')).toBeInTheDocument()
  })

  it('limits cell to 4 lessons and shows "+ ещё N"', () => {
    renderView(fiveInOneDay)
    expect(screen.getAllByText(/Занятие \d/)).toHaveLength(4)
    expect(screen.getByText('+ ещё 1')).toBeInTheDocument()
  })

  it('paging with arrows changes the month title', async () => {
    const user = userEvent.setup()
    renderView()
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }))
    expect(screen.getByText(/сентябрь 2026/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
    await user.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
    expect(screen.getByText(/июль 2026/)).toBeInTheDocument()
  })

  it('"Сегодня" returns to the current month and is disabled there', async () => {
    const user = userEvent.setup()
    renderView()
    const today = screen.getByRole('button', { name: 'Сегодня' })
    expect(today).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Следующий месяц' }))
    expect(screen.getByText(/сентябрь 2026/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Сегодня' }))
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()
  })

  it('fires onEdit and onDelete from lesson actions', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<MonthView lessons={weekdayLessons} onEdit={onEdit} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(onEdit).toHaveBeenCalledWith(weekdayLessons[0])
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })
})
