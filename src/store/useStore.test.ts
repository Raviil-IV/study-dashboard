import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'
import type { Task } from '../types'

const { postMock, patchMock, deleteMock, putMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: postMock, patch: patchMock, put: putMock, delete: deleteMock },
}))
vi.mock('../lib/toast', () => ({ notifyError: vi.fn(), useToast: { getState: () => ({ show: vi.fn() }) } }))

beforeEach(() => {
  vi.clearAllMocks()
  useStore.setState({
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: { memory: {}, snake: {}, minesweeper: {} },
  })
})

describe('useStore', () => {
  it('adds a task optimistically and posts it to the server', () => {
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Решить 5 задач', priority: 'medium', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].title).toBe('Решить 5 задач')
    expect(postMock).toHaveBeenCalledWith('/tasks', expect.objectContaining({ title: 'Решить 5 задач' }))
  })

  it('rolls back an optimistic add when the server rejects', async () => {
    postMock.mockRejectedValue(new Error('Что-то пошло не так'))
    useStore.getState().addTask({ title: 'X', priority: 'low', status: 'todo' })
    expect(useStore.getState().tasks).toHaveLength(1)
    await vi.waitFor(() => expect(useStore.getState().tasks).toHaveLength(0))
  })

  it('toggles a task status and patches the server', () => {
    postMock.mockResolvedValue({} as Task)
    patchMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Прочитать параграф', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    useStore.getState().toggleTask(id)
    expect(useStore.getState().tasks[0].status).toBe('done')
    expect(useStore.getState().tasks[0].completedAt).toBeTruthy()
    expect(patchMock).toHaveBeenCalledWith(`/tasks/${id}`, expect.objectContaining({ status: 'done' }))
  })

  it('rolls back an optimistic patch on failure', async () => {
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'A', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    patchMock.mockRejectedValue(new Error('fail'))
    useStore.getState().updateTask(id, { title: 'B' })
    expect(useStore.getState().tasks[0].title).toBe('B')
    await vi.waitFor(() => expect(useStore.getState().tasks[0].title).toBe('A'))
  })

  it('removes a task and calls the server', () => {
    deleteMock.mockResolvedValue(undefined)
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'Удалить', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    useStore.getState().removeTask(id)
    expect(useStore.getState().tasks).toHaveLength(0)
    expect(deleteMock).toHaveBeenCalledWith(`/tasks/${id}`)
  })

  it('hydrate() replaces all collections', () => {
    useStore.getState().hydrate({
      lessons: [],
      tasks: [{ id: 't1', title: 'Из сервера', priority: 'high', status: 'todo', createdAt: '2026-08-01T00:00:00.000Z' }],
      deadlines: [],
      notes: [],
      focusSessions: [],
      settings: { theme: 'dark', pomodoroWorkMinutes: 50, pomodoroShortBreakMinutes: 10, pomodoroLongBreakMinutes: 20 },
      gameRecords: { memory: {}, snake: { easy: 5 }, minesweeper: {} },
    })
    expect(useStore.getState().tasks[0].title).toBe('Из сервера')
    expect(useStore.getState().settings.theme).toBe('dark')
  })

  it('submitGameRecord is server-authoritative', async () => {
    putMock.mockResolvedValue({ isRecord: true })
    const isRecord = await useStore.getState().submitGameRecord('memory', 'easy', 12)
    expect(isRecord).toBe(true)
    expect(useStore.getState().gameRecords.memory.easy).toBe(12)
  })

  it('submitGameRecord does not update the store when the server says no', async () => {
    putMock.mockResolvedValue({ isRecord: false })
    const isRecord = await useStore.getState().submitGameRecord('snake', 'medium', 10)
    expect(isRecord).toBe(false)
    expect(useStore.getState().gameRecords.snake.medium).toBeUndefined()
  })

  it('resetLocal() clears all collections', () => {
    postMock.mockResolvedValue({} as Task)
    useStore.getState().addTask({ title: 'X', priority: 'low', status: 'todo' })
    useStore.getState().resetLocal()
    expect(useStore.getState().tasks).toHaveLength(0)
  })

  it('applyRanepaImport replaces imported lessons of the source and keeps the rest', () => {
    const url = 'https://spb.ranepa.ru/raspisanie/bi-4-24-02-semestr/'
    useStore.setState({
      lessons: [
        { id: 'imp1', title: 'Старая пара', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: url },
        { id: 'man1', title: 'Моя пара', type: 'weekly', weekday: 1, startTime: '09:00', endTime: '10:30' },
      ],
    })

    useStore.getState().applyRanepaImport(url, [
      { id: 'imp2', title: 'Новая пара', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: url },
    ])

    expect(useStore.getState().lessons.map((l) => l.title).sort()).toEqual(['Моя пара', 'Новая пара'])
  })

  it('removeRanepaImports deletes imported lessons and calls the server', () => {
    deleteMock.mockResolvedValue(undefined)
    useStore.setState({
      lessons: [
        { id: 'imp1', title: 'Импортированная', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: 'https://spb.ranepa.ru/raspisanie/x/' },
        { id: 'man1', title: 'Моя пара', type: 'weekly', weekday: 1, startTime: '09:00', endTime: '10:30' },
      ],
    })

    useStore.getState().removeRanepaImports()

    expect(useStore.getState().lessons.map((l) => l.title)).toEqual(['Моя пара'])
    expect(deleteMock).toHaveBeenCalledWith('/ranepa/import')
  })

  it('removeRanepaImports rolls back when the server rejects', async () => {
    deleteMock.mockRejectedValue(new Error('fail'))
    useStore.setState({
      lessons: [
        { id: 'imp1', title: 'Импортированная', type: 'once', weekday: 5, startTime: '18:30', endTime: '19:50', date: '2026-09-04', sourceUrl: 'https://spb.ranepa.ru/raspisanie/x/' },
      ],
    })

    useStore.getState().removeRanepaImports()
    expect(useStore.getState().lessons).toHaveLength(0)

    await vi.waitFor(() => expect(useStore.getState().lessons).toHaveLength(1))
  })
})
