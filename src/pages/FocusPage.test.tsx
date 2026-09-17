import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FocusPage from './FocusPage'
import { useStore } from '../store/useStore'
import { usePomodoroStore } from '../store/usePomodoroStore'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FocusPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  const now = new Date().toISOString()
  useStore.setState({
    lessons: [],
    tasks: [{ id: '1', title: 'Решить задачи', subject: 'Математика', priority: 'high', status: 'todo', createdAt: now }],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: { memory: {}, snake: {}, minesweeper: {} },
  })
  usePomodoroStore.getState().resetAll()
})

describe('FocusPage', () => {
  it('keeps the running timer across navigation', () => {
    usePomodoroStore.setState({ isRunning: true, mode: 'work', secondsLeft: 24 * 60 + 55 })
    const { unmount } = renderPage()
    expect(screen.getByText('24:55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Пауза' })).toBeInTheDocument()
    unmount()
    renderPage()
    expect(screen.getByText('24:55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Пауза' })).toBeInTheDocument()
  })

  it('keeps the selected subject across navigation', () => {
    usePomodoroStore.setState({ subject: 'Математика' })
    const { unmount } = renderPage()
    expect((screen.getByLabelText('Предмет') as HTMLSelectElement).value).toBe('Математика')
    unmount()
    renderPage()
    expect((screen.getByLabelText('Предмет') as HTMLSelectElement).value).toBe('Математика')
  })

  it('stores the selected subject when changed', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Предмет'), { target: { value: 'Математика' } })
    expect(usePomodoroStore.getState().subject).toBe('Математика')
  })
})
