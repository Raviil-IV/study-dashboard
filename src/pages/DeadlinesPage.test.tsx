import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DeadlinesPage from './DeadlinesPage'
import { useStore } from '../store/useStore'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DeadlinesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    deadlines: [
      { id: '1', title: 'Контрольная по алгебре', type: 'test', subject: 'Математика', date: iso(1), createdAt: new Date().toISOString() },
      { id: '2', title: 'Старый экзамен', type: 'exam', subject: 'Физика', date: iso(-3), createdAt: new Date().toISOString() },
    ],
  })
})

describe('DeadlinesPage', () => {
  it('shows upcoming deadlines and hides past ones', () => {
    renderPage()
    expect(screen.getByText('Контрольная по алгебре')).toBeInTheDocument()
    expect(screen.queryByText('Старый экзамен')).not.toBeInTheDocument()
  })

  it('shows past deadlines on the past tab', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Прошедшие' }))
    expect(screen.getByText('Старый экзамен')).toBeInTheDocument()
  })

  it('adds a deadline', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Добавить дедлайн' }))
    await user.type(screen.getByLabelText('Название'), 'Проект по информатике')
    await user.selectOptions(screen.getByLabelText('Тип'), 'project')
    await user.type(screen.getByLabelText('Дата'), iso(5))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(useStore.getState().deadlines).toHaveLength(3)
    expect(screen.getByText('Проект по информатике')).toBeInTheDocument()
  })
})
