import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MinesweeperPage from './MinesweeperPage'
import { useStore } from '../store/useStore'
import { EMPTY_GAME_RECORDS } from '../lib/games/types'

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }))

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: putMock, delete: vi.fn() },
}))

const RESET_STATE = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system' as const, pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: EMPTY_GAME_RECORDS,
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // deterministic mine placement: mock≈1 → Fisher-Yates is a no-op → mines land
  // at the first candidate indices (top edge cluster), so opening the center wins
  vi.spyOn(Math, 'random').mockReturnValue(0.999)
  putMock.mockResolvedValue({ isRecord: true })
  localStorage.clear()
  useStore.setState(RESET_STATE)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('MinesweeperPage', () => {
  it('renders the easy 9x9 field', () => {
    render(
      <MemoryRouter>
        <MinesweeperPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByTestId(/mine-cell-/)).toHaveLength(81)
  })

  it('flags a cell in flag mode and unflags on second click', () => {
    render(
      <MemoryRouter>
        <MinesweeperPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Флаг' }))
    fireEvent.click(screen.getByTestId('mine-cell-0'))
    expect(screen.getByTestId('mine-cell-0')).toHaveAttribute('data-state', 'flagged')
    fireEvent.click(screen.getByTestId('mine-cell-0'))
    expect(screen.getByTestId('mine-cell-0')).toHaveAttribute('data-state', 'hidden')
  })

  it('opens a cell on click and wins when the field floods', async () => {
    render(
      <MemoryRouter>
        <MinesweeperPage />
      </MemoryRouter>,
    )
    // with the deterministic top-edge mine cluster, opening the center floods the board
    fireEvent.click(screen.getByTestId('mine-cell-40'))
    await act(async () => {})
    expect(screen.getByTestId('mine-cell-40')).toHaveAttribute('data-state', 'revealed')
    expect(screen.getByText('Победа!')).toBeInTheDocument()
    expect(useStore.getState().gameRecords.minesweeper.easy).toBe(0)
  })

  it('closes the result modal without reopening it', async () => {
    render(
      <MemoryRouter>
        <MinesweeperPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByTestId('mine-cell-40')) // flood → win
    await act(async () => {})
    expect(screen.getByText('Победа!')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Закрыть' })[0])
    expect(screen.queryByText('Победа!')).not.toBeInTheDocument()
  })

  it('switches difficulty and resets the field', () => {
    render(
      <MemoryRouter>
        <MinesweeperPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Средний' }))
    expect(screen.getAllByTestId(/mine-cell-/)).toHaveLength(16 * 16)
  })
})
