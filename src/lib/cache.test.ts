import { describe, expect, it } from 'vitest'
import { cacheState, clearCachedState, loadCachedState } from './cache'
import type { ServerState } from '../store/useStore'

const sample: ServerState = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'dark', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: { memory: {}, snake: {}, minesweeper: {} },
}

describe('offline cache', () => {
  it('round-trips a state snapshot', () => {
    cacheState(sample)
    expect(loadCachedState()).toEqual(sample)
  })

  it('returns null when nothing is cached', () => {
    localStorage.clear()
    expect(loadCachedState()).toBeNull()
  })

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('study-dashboard:cache', '{corrupt')
    expect(loadCachedState()).toBeNull()
  })

  it('clearCachedState removes the snapshot', () => {
    cacheState(sample)
    clearCachedState()
    expect(localStorage.getItem('study-dashboard:cache')).toBeNull()
    expect(loadCachedState()).toBeNull()
  })
})
