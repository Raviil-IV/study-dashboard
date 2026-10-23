import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeekView from './WeekView'
import type { Lesson } from '../../types'

const imported: Lesson[] = [
  {
    id: '1',
    type: 'once',
    title: 'СДО пара',
    weekday: 4,
    startTime: '15:00',
    endTime: '16:00',
    date: '2026-08-06',
    color: 'blue',
    sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
  },
]
const manual: Lesson[] = [
  { id: '2', type: 'once', title: 'Своя пара', weekday: 4, startTime: '15:00', endTime: '16:00', date: '2026-08-06', color: 'blue' },
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // Thursday 2026-08-06
})
afterEach(() => {
  vi.useRealTimers()
})

describe('WeekView', () => {
  it('fills an imported lesson and drops its dot', () => {
    render(<WeekView lessons={imported} onEdit={() => {}} />)
    const chip = screen.getByText('СДО пара').closest('button')
    expect(chip?.className).toContain('bg-[#013A33]/30')
    expect(chip?.querySelector('.bg-blue-500')).toBeNull()
  })

  it('keeps the dot for a manually created lesson', () => {
    render(<WeekView lessons={manual} onEdit={() => {}} />)
    const chip = screen.getByText('Своя пара').closest('button')
    expect(chip?.className).toContain('bg-gray-50')
    expect(chip?.querySelector('.bg-blue-500')).not.toBeNull()
  })
})
