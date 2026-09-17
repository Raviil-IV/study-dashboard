import { describe, expect, it, beforeEach, vi } from 'vitest'
import { usePomodoroStore } from './usePomodoroStore'
import { useStore } from './useStore'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: postMock, patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
  postMock.mockResolvedValue({})
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

describe('usePomodoroStore', () => {
  it('starts in work mode with a full duration', () => {
    const s = usePomodoroStore.getState()
    expect(s.mode).toBe('work')
    expect(s.secondsLeft).toBe(25 * 60)
    expect(s.isRunning).toBe(false)
  })

  it('counts down one second per tick while running', () => {
    const s = usePomodoroStore.getState()
    s.start()
    usePomodoroStore.getState().tick()
    expect(usePomodoroStore.getState().secondsLeft).toBe(25 * 60 - 1)
  })

  it('switches to a short break and logs a session with the subject when work completes', () => {
    const s = usePomodoroStore.getState()
    s.setSubject('Математика')
    s.start()
    for (let i = 0; i < 25 * 60; i++) {
      usePomodoroStore.getState().tick()
    }
    const next = usePomodoroStore.getState()
    expect(next.mode).toBe('shortBreak')
    expect(next.secondsLeft).toBe(5 * 60)
    expect(next.isRunning).toBe(false)
    expect(next.sessionCount).toBe(1)
    expect(useStore.getState().focusSessions).toHaveLength(1)
    expect(useStore.getState().focusSessions[0].subject).toBe('Математика')
    expect(postMock).toHaveBeenCalledWith('/focus-sessions', expect.objectContaining({ subject: 'Математика' }))
  })

  it('switches back to work without logging a session when a break completes', () => {
    const s = usePomodoroStore.getState()
    s.setMode('shortBreak')
    s.start()
    for (let i = 0; i < 5 * 60; i++) {
      usePomodoroStore.getState().tick()
    }
    const next = usePomodoroStore.getState()
    expect(next.mode).toBe('work')
    expect(next.secondsLeft).toBe(25 * 60)
    expect(next.isRunning).toBe(false)
    expect(next.sessionCount).toBe(0)
    expect(useStore.getState().focusSessions).toHaveLength(0)
  })

  it('resets the timer to full duration and stops it', () => {
    const s = usePomodoroStore.getState()
    s.start()
    for (let i = 0; i < 5; i++) {
      usePomodoroStore.getState().tick()
    }
    usePomodoroStore.getState().reset()
    const next = usePomodoroStore.getState()
    expect(next.secondsLeft).toBe(25 * 60)
    expect(next.isRunning).toBe(false)
  })

  it('setMode stops the timer and switches to the requested duration', () => {
    const s = usePomodoroStore.getState()
    s.start()
    s.setMode('longBreak')
    const next = usePomodoroStore.getState()
    expect(next.mode).toBe('longBreak')
    expect(next.secondsLeft).toBe(15 * 60)
    expect(next.isRunning).toBe(false)
  })

  it('syncDurations updates a paused timer when settings change', () => {
    usePomodoroStore.getState().reset()
    useStore.setState({
      settings: { theme: 'system', pomodoroWorkMinutes: 30, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    })
    usePomodoroStore.getState().syncDurations()
    expect(usePomodoroStore.getState().secondsLeft).toBe(30 * 60)
  })
})
