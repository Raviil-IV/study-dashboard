import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MemoryPage from './MemoryPage'
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
  // deterministic shuffle: sort comparator stays negative → deck keeps pair order [e0..e7, e0..e7]
  vi.spyOn(Math, 'random').mockReturnValue(0)
  localStorage.clear()
  useStore.setState(RESET_STATE)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MemoryPage', () => {
  it('renders a 4x4 grid on easy difficulty', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId(/memory-card-/)).toHaveLength(16)
  })

  it('keeps a matched pair open and counts moves', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    // with the deterministic deck, card i matches card i+8
    fireEvent.click(screen.getByTestId('memory-card-0'))
    fireEvent.click(screen.getByTestId('memory-card-8'))
    expect(screen.getByTestId('memory-card-0')).toHaveAttribute('data-state', 'open')
    expect(screen.getByTestId('memory-card-8')).toHaveAttribute('data-state', 'open')
    expect(screen.getByText('Ходы: 1 · Время: 0 с')).toBeInTheDocument()
  })

  it('flips a mismatched pair back after 700 ms', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('memory-card-0'))
    fireEvent.click(screen.getByTestId('memory-card-1'))
    expect(screen.getByTestId('memory-card-0')).toHaveAttribute('data-state', 'open')
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(screen.getByTestId('memory-card-0')).toHaveAttribute('data-state', 'closed')
    expect(screen.getByTestId('memory-card-1')).toHaveAttribute('data-state', 'closed')
  })

  it('shows win modal with moves and saves a record', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    const pairs = [
      [0, 8],
      [1, 9],
      [2, 10],
      [3, 11],
      [4, 12],
      [5, 13],
      [6, 14],
      [7, 15],
    ]
    for (const [a, b] of pairs) {
      fireEvent.click(screen.getByTestId(`memory-card-${a}`))
      fireEvent.click(screen.getByTestId(`memory-card-${b}`))
    }
    expect(screen.getByText('Победа! 🎉')).toBeInTheDocument()
    expect(screen.getByText('Результат: 8 ходов за 0 с')).toBeInTheDocument()
    expect(useStore.getState().gameRecords.memory.easy).toBe(8)
  })

  it('switches difficulty and resets the game', () => {
    render(
      <MemoryRouter>
        <MemoryPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Средний' }))
    expect(screen.getAllByTestId(/memory-card-/)).toHaveLength(24)
    expect(screen.getByText('Ходы: 0 · Время: 0 с')).toBeInTheDocument()
  })
})
