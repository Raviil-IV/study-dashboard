import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useStore } from './useStore'
import type { Deadline, FocusSession, Lesson, Note, Task } from '../types'

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

  it('un-completing a task sends completedAt null so the server clears it', () => {
    patchMock.mockResolvedValue({} as Task)
    useStore.setState({
      tasks: [{ id: 't1', title: 'Готово', priority: 'low', status: 'done', createdAt: '2026-09-01T09:00:00.000Z', completedAt: '2026-09-02T10:00:00.000Z' }],
    })
    useStore.getState().toggleTask('t1')
    expect(patchMock).toHaveBeenCalledWith('/tasks/t1', { status: 'todo', completedAt: null })
    expect(useStore.getState().tasks[0].completedAt).toBeNull()
  })

  it('updateTask sets completedAt when the status changes to done', () => {
    patchMock.mockResolvedValue({} as Task)
    useStore.setState({
      tasks: [{ id: 't2', title: 'Задача', priority: 'low', status: 'todo', createdAt: '2026-09-01T09:00:00.000Z' }],
    })
    useStore.getState().updateTask('t2', { status: 'done' })
    const completedAt = useStore.getState().tasks[0].completedAt
    expect(completedAt).toEqual(expect.any(String))
    expect(completedAt).toBe(new Date(completedAt as string).toISOString())
    expect(patchMock).toHaveBeenCalledWith('/tasks/t2', { status: 'done', completedAt })
  })

  it('updateTask clears completedAt when the status changes away from done', () => {
    patchMock.mockResolvedValue({} as Task)
    useStore.setState({
      tasks: [{ id: 't3', title: 'Задача', priority: 'low', status: 'done', createdAt: '2026-09-01T09:00:00.000Z', completedAt: '2026-09-02T10:00:00.000Z' }],
    })
    useStore.getState().updateTask('t3', { status: 'todo' })
    expect(useStore.getState().tasks[0].completedAt).toBeNull()
    expect(patchMock).toHaveBeenCalledWith('/tasks/t3', { status: 'todo', completedAt: null })
  })

  it('updateTask without a status change leaves completedAt untouched', () => {
    patchMock.mockResolvedValue({} as Task)
    useStore.setState({
      tasks: [{ id: 't4', title: 'Задача', priority: 'low', status: 'done', createdAt: '2026-09-01T09:00:00.000Z', completedAt: '2026-09-02T10:00:00.000Z' }],
    })
    useStore.getState().updateTask('t4', { title: 'Новое название' })
    expect(useStore.getState().tasks[0].completedAt).toBe('2026-09-02T10:00:00.000Z')
    expect(patchMock).toHaveBeenCalledWith('/tasks/t4', { title: 'Новое название' })
    expect(patchMock.mock.calls[0][1]).not.toHaveProperty('completedAt')
  })

  it('rolls back an optimistic patch on failure', async () => {
    postMock.mockImplementation(async (_path: string, task: Task) => task)
    useStore.getState().addTask({ title: 'A', priority: 'low', status: 'todo' })
    const id = useStore.getState().tasks[0].id
    await Promise.resolve()
    await Promise.resolve()
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

  it('adopts the server id for an optimistically added lesson', async () => {
    const created: Lesson = {
      id: '0f5c9c1e-6a3b-4b0a-8c7d-2f9e1a4b6c8d',
      title: 'Матанализ',
      type: 'weekly',
      weekday: 1,
      startTime: '09:00',
      endTime: '10:30',
    }
    postMock.mockResolvedValue(created)

    useStore.getState().addLesson({ title: 'Матанализ', type: 'weekly', weekday: 1, startTime: '09:00', endTime: '10:30' })
    const tempId = useStore.getState().lessons[0].id
    expect(tempId).not.toBe(created.id)

    await Promise.resolve()
    await Promise.resolve()

    expect(useStore.getState().lessons).toHaveLength(1)
    expect(useStore.getState().lessons[0].id).toBe(created.id)
    expect(useStore.getState().lessons.some((l) => l.id === tempId)).toBe(false)
  })

  it('adopts the server id for an optimistically added task', async () => {
    const created: Task = {
      id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      title: 'Решить 5 задач',
      priority: 'medium',
      status: 'todo',
      createdAt: '2026-09-29T09:00:00.000Z',
    }
    postMock.mockResolvedValue(created)

    useStore.getState().addTask({ title: 'Решить 5 задач', priority: 'medium', status: 'todo' })
    const tempId = useStore.getState().tasks[0].id
    expect(tempId).not.toBe(created.id)

    await Promise.resolve()
    await Promise.resolve()

    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].id).toBe(created.id)
    expect(useStore.getState().tasks.some((t) => t.id === tempId)).toBe(false)
  })

  it('adopts the server id for an optimistically added deadline', async () => {
    const created: Deadline = {
      id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
      title: 'Экзамен по матанализу',
      type: 'exam',
      date: '2026-12-20',
      createdAt: '2026-09-29T09:00:00.000Z',
    }
    postMock.mockResolvedValue(created)

    useStore.getState().addDeadline({ title: 'Экзамен по матанализу', type: 'exam', date: '2026-12-20' })
    const tempId = useStore.getState().deadlines[0].id
    expect(tempId).not.toBe(created.id)

    await Promise.resolve()
    await Promise.resolve()

    expect(useStore.getState().deadlines).toHaveLength(1)
    expect(useStore.getState().deadlines[0].id).toBe(created.id)
    expect(useStore.getState().deadlines.some((d) => d.id === tempId)).toBe(false)
  })

  it('adopts the server id for an optimistically added note', async () => {
    const created: Note = {
      id: '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f',
      title: 'Конспект',
      content: 'Производные',
      tags: ['матан'],
      pinned: false,
      createdAt: '2026-09-29T09:00:00.000Z',
      updatedAt: '2026-09-29T09:00:00.000Z',
    }
    postMock.mockResolvedValue(created)

    useStore.getState().addNote({ title: 'Конспект', content: 'Производные', tags: ['матан'], pinned: false })
    const tempId = useStore.getState().notes[0].id
    expect(tempId).not.toBe(created.id)

    await Promise.resolve()
    await Promise.resolve()

    expect(useStore.getState().notes).toHaveLength(1)
    expect(useStore.getState().notes[0].id).toBe(created.id)
    expect(useStore.getState().notes.some((n) => n.id === tempId)).toBe(false)
  })

  it('adopts the server id for an optimistically added focus session', async () => {
    const created: FocusSession = {
      id: '4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a',
      startedAt: '2026-09-29T09:00:00.000Z',
      durationMinutes: 25,
      completed: true,
    }
    postMock.mockResolvedValue(created)

    useStore.getState().addFocusSession({ durationMinutes: 25, completed: true })
    const tempId = useStore.getState().focusSessions[0].id
    expect(tempId).not.toBe(created.id)

    await Promise.resolve()
    await Promise.resolve()

    expect(useStore.getState().focusSessions).toHaveLength(1)
    expect(useStore.getState().focusSessions[0].id).toBe(created.id)
    expect(useStore.getState().focusSessions.some((f) => f.id === tempId)).toBe(false)
  })
})
