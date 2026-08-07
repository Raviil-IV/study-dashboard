import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SnakePage from './SnakePage'
import { useStore } from '../store/useStore'

const RESET_STATE = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: {},
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // deterministic food spawn: first free cell is (0,0)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  localStorage.clear()
  useStore.setState(RESET_STATE)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SnakePage', () => {
  it('renders the initial snake on the board', () => {
    render(
      <MemoryRouter>
        <SnakePage />
      </MemoryRouter>,
    )
    // size 15 → head at center (7,7), body (6,7), (5,7); food at (0,0)
    expect(screen.getByTestId('snake-cell-7-7')).toHaveAttribute('data-role', 'head')
    expect(screen.getByTestId('snake-cell-6-7')).toHaveAttribute('data-role', 'body')
    expect(screen.getByTestId('snake-cell-5-7')).toHaveAttribute('data-role', 'body')
    expect(screen.getByTestId('snake-cell-0-0')).toHaveAttribute('data-role', 'food')
  })

  it('changes direction with arrow keys', () => {
    render(
      <MemoryRouter>
        <SnakePage />
      </MemoryRouter>,
    )
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    act(() => {
      vi.advanceTimersByTime(150) // easy speed
    })
    expect(screen.getByTestId('snake-cell-7-8')).toHaveAttribute('data-role', 'head')
    expect(screen.getByTestId('snake-cell-5-7')).not.toHaveAttribute('data-role') // tail cell is now empty
  })

  it('shows game over modal on wall collision and saves a record', () => {
    render(
      <MemoryRouter>
        <SnakePage />
      </MemoryRouter>,
    )
    // start the game heading right, then collide with the wall on the 8th step
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(150 * 8)
    })
    expect(screen.getByText('Игра окончена 💀')).toBeInTheDocument()
    expect(useStore.getState().gameRecords.snake.easy).toBe(0)
  })

  it('switches difficulty and applies its speed', () => {
    render(
      <MemoryRouter>
        <SnakePage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Средний' }))
    act(() => {
      vi.advanceTimersByTime(100) // not started yet — no movement
    })
    expect(screen.getByTestId('snake-cell-7-7')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(100) // medium speed: 100ms per tick
    })
    expect(screen.getByTestId('snake-cell-8-7')).toBeInTheDocument() // one tick to the right
  })

  it('restarts the game after game over', () => {
    render(
      <MemoryRouter>
        <SnakePage />
      </MemoryRouter>,
    )
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    act(() => {
      vi.advanceTimersByTime(150 * 8) // wall collision on the 8th step
    })
    expect(screen.getByText('Игра окончена 💀')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Заново' })[0])
    expect(screen.queryByText('Игра окончена 💀')).not.toBeInTheDocument()
    expect(screen.getByTestId('snake-cell-7-7')).toBeInTheDocument()
  })
})
