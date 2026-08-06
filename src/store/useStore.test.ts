import { describe, expect, it, beforeEach } from 'vitest'
import { useStore } from './useStore'

beforeEach(() => {
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
    useStore.getState().addLesson({ title: 'Математика', weekday: 1, startTime: '09:00', endTime: '10:30' })
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
})
