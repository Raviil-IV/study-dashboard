import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { useStore } from './useStore'

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 6, 12, 0)) // 2026-08-06, Thursday
  localStorage.clear()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  })
})

describe('useStore', () => {
  it('adds a task', () => {
    useStore.getState().addTask({ title: 'Решить 5 задач', priority: 'medium', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].title).toBe('Решить 5 задач')
  })

  it('toggles task status', () => {
    const { addTask, toggleTask } = useStore.getState()
    addTask({ title: 'Прочитать параграф', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id

    toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('done')
    expect(useStore.getState().tasks[0].completedAt).toBeTruthy()
    toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('todo')
  })

  it('persists to localStorage under study-dashboard keys', () => {
    useStore.getState().addLesson({ type: 'weekly', title: 'Математика', weekday: 1, startTime: '09:00', endTime: '10:30' })
    const raw = localStorage.getItem('study-dashboard:lessons')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).length).toBeGreaterThan(0)
  })

  it('resets to demo data via resetAll and clears via clearAll', () => {
    const { resetAll, clearAll } = useStore.getState()
    resetAll()
    expect(useStore.getState().lessons.length).toBeGreaterThan(0)
    clearAll()
    expect(useStore.getState().tasks).toHaveLength(0)
  })

  it('migrates legacy lessons without type to weekly', async () => {
    localStorage.setItem('study-dashboard:lessons', JSON.stringify([{ id: '1', title: 'Математика', weekday: 4, startTime: '09:00', endTime: '10:30' }]))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lessons[0].type).toBe('weekly')
  })

  it('drops one-off lessons from a previous calendar week on load', async () => {
    // 2026-08-06 is Thursday; week Monday is 2026-08-03
    localStorage.setItem('study-dashboard:lessons', JSON.stringify([
      { id: '1', type: 'once', title: 'Консультация', weekday: 0, startTime: '09:00', endTime: '10:00', date: '2026-08-02' }, // last Sunday — drop
      { id: '2', type: 'once', title: 'Семинар', weekday: 4, startTime: '09:00', endTime: '10:00', date: '2026-08-06' },       // today — keep
    ]))
    await useStore.persist.rehydrate()
    expect(useStore.getState().lessons.map((l) => l.id)).toEqual(['2'])
  })

  it('falls back to empty collections when stored JSON is corrupt', async () => {
    localStorage.setItem('study-dashboard:lessons', '{not json')
    localStorage.setItem('study-dashboard:tasks', '{not json')
    await useStore.persist.rehydrate()
    expect(useStore.getState().lessons).toEqual([])
    expect(useStore.getState().tasks).toEqual([])
  })

  it('stores the first game record and returns true', () => {
    const { submitGameRecord } = useStore.getState()
    expect(submitGameRecord('memory', 'easy', 12)).toBe(true)
    expect(useStore.getState().gameRecords.memory.easy).toBe(12)
  })

  it('does not replace a record with a worse value (memory = fewer is better)', () => {
    const { submitGameRecord } = useStore.getState()
    submitGameRecord('memory', 'easy', 12)
    expect(submitGameRecord('memory', 'easy', 20)).toBe(false)
    expect(useStore.getState().gameRecords.memory.easy).toBe(12)
  })

  it('replaces a record with a better value (memory = fewer is better)', () => {
    const { submitGameRecord } = useStore.getState()
    submitGameRecord('memory', 'easy', 12)
    expect(submitGameRecord('memory', 'easy', 8)).toBe(true)
    expect(useStore.getState().gameRecords.memory.easy).toBe(8)
  })

  it('treats snake as higher-is-better', () => {
    const { submitGameRecord } = useStore.getState()
    submitGameRecord('snake', 'medium', 10)
    expect(submitGameRecord('snake', 'medium', 8)).toBe(false)
    expect(useStore.getState().gameRecords.snake.medium).toBe(10)
    expect(submitGameRecord('snake', 'medium', 15)).toBe(true)
    expect(useStore.getState().gameRecords.snake.medium).toBe(15)
  })

  it('keeps records per difficulty separate', () => {
    const { submitGameRecord } = useStore.getState()
    submitGameRecord('minesweeper', 'easy', 30)
    submitGameRecord('minesweeper', 'hard', 120)
    expect(useStore.getState().gameRecords.minesweeper.easy).toBe(30)
    expect(useStore.getState().gameRecords.minesweeper.hard).toBe(120)
  })
})

afterEach(() => {
  vi.useRealTimers()
})
