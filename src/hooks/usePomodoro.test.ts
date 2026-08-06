import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro } from './usePomodoro'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('usePomodoro', () => {
  it('starts with work mode and full duration', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    expect(result.current.mode).toBe('work')
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
  })

  it('counts down while running', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(25 * 60 - 1)
  })

  it('switches to short break after a completed work session', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(25 * 60 * 1000))
    expect(result.current.mode).toBe('shortBreak')
    expect(result.current.secondsLeft).toBe(5 * 60)
    expect(result.current.sessionCount).toBe(1)
  })

  it('resets the timer', () => {
    const { result } = renderHook(() => usePomodoro({ workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 }))
    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(5000))
    act(() => result.current.reset())
    expect(result.current.secondsLeft).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
  })
})
