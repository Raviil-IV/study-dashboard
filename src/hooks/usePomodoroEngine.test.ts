import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoroEngine } from './usePomodoroEngine'
import { usePomodoroStore } from '../store/usePomodoroStore'
import { useStore } from '../store/useStore'

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  vi.useFakeTimers()
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

afterEach(() => {
  vi.useRealTimers()
})

describe('usePomodoroEngine', () => {
  it('ticks every second while the timer is running', () => {
    renderHook(() => usePomodoroEngine())
    act(() => usePomodoroStore.getState().start())
    act(() => vi.advanceTimersByTime(3000))
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60 - 3)
  })

  it('stops ticking when the timer pauses', () => {
    renderHook(() => usePomodoroEngine())
    act(() => usePomodoroStore.getState().start())
    act(() => vi.advanceTimersByTime(2000))
    act(() => usePomodoroStore.getState().pause())
    act(() => vi.advanceTimersByTime(5000))
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60 - 2)
  })

  it('resyncs a paused timer when the settings change', () => {
    renderHook(() => usePomodoroEngine())
    act(() => usePomodoroStore.getState().start())
    act(() => vi.advanceTimersByTime(1000))
    act(() => usePomodoroStore.getState().pause())
    act(() => {
      useStore.setState({
        settings: { theme: 'system', pomodoroWorkMinutes: 30, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
      })
    })
    expect(usePomodoroStore.getState().secondsLeft).toBe(30 * 60)
  })

  it('does not resync a running timer when the settings change', () => {
    renderHook(() => usePomodoroEngine())
    act(() => usePomodoroStore.getState().start())
    act(() => vi.advanceTimersByTime(1000))
    act(() => {
      useStore.setState({
        settings: { theme: 'system', pomodoroWorkMinutes: 30, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
      })
    })
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60 - 1)
  })
})
