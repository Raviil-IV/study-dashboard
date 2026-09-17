import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FloatingTimer from './FloatingTimer'
import { usePomodoroStore } from '../../store/usePomodoroStore'
import { useStore } from '../../store/useStore'

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: { memory: {}, snake: {}, minesweeper: {} },
  })
  usePomodoroStore.getState().resetAll()
})

describe('FloatingTimer', () => {
  it('renders nothing when the timer is not running', () => {
    const { container } = render(<FloatingTimer />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the mode label and the countdown while running', () => {
    usePomodoroStore.setState({ isRunning: true, mode: 'work', secondsLeft: 61 })
    render(<FloatingTimer />)
    expect(screen.getByText('Работа')).toBeInTheDocument()
    expect(screen.getByText('01:01')).toBeInTheDocument()
  })

  it('pauses the timer from the widget', () => {
    usePomodoroStore.setState({ isRunning: true, mode: 'shortBreak', secondsLeft: 120 })
    render(<FloatingTimer />)
    fireEvent.click(screen.getByRole('button', { name: 'Пауза' }))
    expect(usePomodoroStore.getState().isRunning).toBe(false)
  })
})
