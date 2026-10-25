import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LessonCard from './LessonCard'
import type { Lesson } from '../../types'

const imported: Lesson = {
  id: '1',
  type: 'once',
  title: 'Пара из РАНХиГС',
  weekday: 4,
  startTime: '09:00',
  endTime: '10:30',
  location: 'каб. 305',
  color: 'green',
  sourceUrl: 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/',
}
const manual: Lesson = { ...imported, id: '2', title: 'Своя пара', sourceUrl: undefined }

describe('LessonCard', () => {
  it('tints the whole card for an imported lesson', () => {
    render(<LessonCard lesson={imported} isNow={false} onEdit={() => {}} />)
    const card = screen.getByRole('button')
    expect(card.className).toContain('bg-[#3D0E69]/30')
    expect(card.querySelector('.bg-green-500')).toBeNull()
    expect(screen.getByText(/09:00/).className).toContain('text-[#553470]')
  })

  it('keeps the white card and the dot for a manual lesson', () => {
    render(<LessonCard lesson={manual} isNow={false} onEdit={() => {}} />)
    const card = screen.getByRole('button')
    expect(card.className).toContain('bg-white')
    expect(card.querySelector('.bg-green-500')).not.toBeNull()
  })

  it('shows «Весь день» for an all-day event', () => {
    const allDay: Lesson = { ...manual, id: '3', title: 'Конференция', allDay: true, startTime: '00:00', endTime: '23:59' }
    render(<LessonCard lesson={allDay} isNow={false} onEdit={() => {}} />)
    expect(screen.getByText(/Весь день/)).toBeInTheDocument()
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument()
  })
})
