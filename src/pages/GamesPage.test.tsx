import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GamesPage from './GamesPage'
import { useStore } from '../store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: {
      memory: { easy: 12, hard: 20 },
      snake: { medium: 15 },
      minesweeper: {},
    },
  })
})

describe('GamesPage', () => {
  it('renders three game cards', () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Мемори')).toBeInTheDocument()
    expect(screen.getByText('Змейка')).toBeInTheDocument()
    expect(screen.getByText('Сапёр')).toBeInTheDocument()
  })

  it('links to the right game routes', () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Мемори/ })).toHaveAttribute('href', '/games/memory')
    expect(screen.getByRole('link', { name: /Змейка/ })).toHaveAttribute('href', '/games/snake')
    expect(screen.getByRole('link', { name: /Сапёр/ })).toHaveAttribute('href', '/games/minesweeper')
  })

  it('shows best records per difficulty', () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    )
    // memory: easy 12 moves, hard 20 moves
    expect(screen.getByText('Лёгкий: 12 ходов')).toBeInTheDocument()
    expect(screen.getByText('Сложный: 20 ходов')).toBeInTheDocument()
    // snake: medium 15 points
    expect(screen.getByText('Средний: 15 очков')).toBeInTheDocument()
  })
})
