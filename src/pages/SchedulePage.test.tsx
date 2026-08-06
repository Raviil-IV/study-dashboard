import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SchedulePage from './SchedulePage'
import { useStore } from '../store/useStore'

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // 2026-08-06, Thursday
  localStorage.clear()
  useStore.setState({
    lessons: [{ id: '1', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30', location: 'Каб. 201', color: 'blue' }],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('SchedulePage', () => {
  it('shows lesson in day view (today is Thursday, weekday 4)', () => {
    renderPage()
    expect(screen.getByText('Математика')).toBeInTheDocument()
  })

  it('switches to week view', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Неделя' }))
    expect(screen.getByText('Пн')).toBeInTheDocument()
  })

  it('adds a lesson via the modal form', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.selectOptions(screen.getByLabelText('День недели'), '4')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(2)
    expect(useStore.getState().lessons[1].title).toBe('Физика')
    expect(screen.getByText('Физика')).toBeInTheDocument()
  })

  it('validates end time after start time', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить занятие' }))
    await user.type(screen.getByLabelText('Название'), 'Физика')
    await user.clear(screen.getByLabelText('Начало'))
    await user.type(screen.getByLabelText('Начало'), '12:00')
    await user.clear(screen.getByLabelText('Конец'))
    await user.type(screen.getByLabelText('Конец'), '11:00')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().lessons).toHaveLength(1)
    expect(screen.getByText('Время конца должно быть позже времени начала')).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
