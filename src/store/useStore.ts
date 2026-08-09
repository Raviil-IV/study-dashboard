import { create } from 'zustand'
import type { Deadline, FocusSession, Lesson, Note, Settings, Task } from '../types'
import type { GameId, GameDifficulty, GameRecord } from '../lib/games/types'
import { EMPTY_GAME_RECORDS } from '../lib/games/types'
import { api } from '../lib/api'
import { notifyError } from '../lib/toast'
import { uid } from '../lib/id'

export type TaskInput = Omit<Task, 'id' | 'createdAt'>
export type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>

export interface StoreState {
  lessons: Lesson[]
  tasks: Task[]
  deadlines: Deadline[]
  notes: Note[]
  focusSessions: FocusSession[]
  settings: Settings
  gameRecords: GameRecord
  addLesson: (input: Omit<Lesson, 'id'>) => void
  updateLesson: (id: string, patch: Partial<Lesson>) => void
  removeLesson: (id: string) => void
  addTask: (input: TaskInput) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  addDeadline: (input: Omit<Deadline, 'id' | 'createdAt'>) => void
  updateDeadline: (id: string, patch: Partial<Deadline>) => void
  removeDeadline: (id: string) => void
  addNote: (input: NoteInput) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  togglePinNote: (id: string) => void
  addFocusSession: (input: Omit<FocusSession, 'id' | 'startedAt'>) => void
  updateSettings: (patch: Partial<Settings>) => void
  submitGameRecord: (game: GameId, difficulty: GameDifficulty, value: number) => Promise<boolean>
  hydrate: (state: ServerState) => void
  resetLocal: () => void
}

export type ServerState = Pick<StoreState, 'lessons' | 'tasks' | 'deadlines' | 'notes' | 'focusSessions' | 'settings' | 'gameRecords'>

const EMPTY_STATE: ServerState = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: { theme: 'system', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
  gameRecords: EMPTY_GAME_RECORDS,
}

function rollback<T extends { id: string }>(items: T[], id: string, prev: T): T[] {
  return items.map((item) => (item.id === id ? { ...prev } : item))
}

export const useStore = create<StoreState>((set, get) => ({
  ...EMPTY_STATE,

  addLesson: (input) => {
    const lesson = { ...input, id: uid() }
    set((s) => ({ lessons: [...s.lessons, lesson] }))
    void api.post<Lesson>('/lessons', lesson).catch((err) => {
      set((s) => ({ lessons: s.lessons.filter((l) => l.id !== lesson.id) }))
      notifyError(err)
    })
  },
  updateLesson: (id, patch) => {
    const prev = get().lessons.find((l) => l.id === id)
    set((s) => ({ lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
    if (prev) {
      void api.patch<Lesson>(`/lessons/${id}`, patch).catch((err) => {
        set((s) => ({ lessons: rollback(s.lessons, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeLesson: (id) => {
    const prev = get().lessons
    set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) }))
    void api.delete(`/lessons/${id}`).catch((err) => {
      set({ lessons: prev })
      notifyError(err)
    })
  },

  addTask: (input) => {
    const task: Task = { ...input, id: uid(), createdAt: new Date().toISOString() }
    set((s) => ({ tasks: [...s.tasks, task] }))
    void api.post<Task>('/tasks', task).catch((err) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) }))
      notifyError(err)
    })
  },
  updateTask: (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    if (prev) {
      void api.patch<Task>(`/tasks/${id}`, patch).catch((err) => {
        set((s) => ({ tasks: rollback(s.tasks, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeTask: (id) => {
    const prev = get().tasks
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    void api.delete(`/tasks/${id}`).catch((err) => {
      set({ tasks: prev })
      notifyError(err)
    })
  },
  toggleTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const patch = task.status === 'done'
      ? { status: 'todo' as const, completedAt: undefined }
      : { status: 'done' as const, completedAt: new Date().toISOString() }
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    void api.patch<Task>(`/tasks/${id}`, patch).catch((err) => {
      set((s) => ({ tasks: rollback(s.tasks, id, task) }))
      notifyError(err)
    })
  },

  addDeadline: (input) => {
    const deadline: Deadline = { ...input, id: uid(), createdAt: new Date().toISOString() }
    set((s) => ({ deadlines: [...s.deadlines, deadline] }))
    void api.post<Deadline>('/deadlines', deadline).catch((err) => {
      set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== deadline.id) }))
      notifyError(err)
    })
  },
  updateDeadline: (id, patch) => {
    const prev = get().deadlines.find((d) => d.id === id)
    set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
    if (prev) {
      void api.patch<Deadline>(`/deadlines/${id}`, patch).catch((err) => {
        set((s) => ({ deadlines: rollback(s.deadlines, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeDeadline: (id) => {
    const prev = get().deadlines
    set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) }))
    void api.delete(`/deadlines/${id}`).catch((err) => {
      set({ deadlines: prev })
      notifyError(err)
    })
  },

  addNote: (input) => {
    const now = new Date().toISOString()
    const note: Note = { ...input, id: uid(), createdAt: now, updatedAt: now }
    set((s) => ({ notes: [...s.notes, note] }))
    void api.post<Note>('/notes', note).catch((err) => {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== note.id) }))
      notifyError(err)
    })
  },
  updateNote: (id, patch) => {
    const prev = get().notes.find((n) => n.id === id)
    const nextPatch = { ...patch, updatedAt: new Date().toISOString() }
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...nextPatch } : n)) }))
    if (prev) {
      void api.patch<Note>(`/notes/${id}`, nextPatch).catch((err) => {
        set((s) => ({ notes: rollback(s.notes, id, prev) }))
        notifyError(err)
      })
    }
  },
  removeNote: (id) => {
    const prev = get().notes
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
    void api.delete(`/notes/${id}`).catch((err) => {
      set({ notes: prev })
      notifyError(err)
    })
  },
  togglePinNote: (id) => {
    const prev = get().notes.find((n) => n.id === id)
    if (!prev) return
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) }))
    const pinned = !prev.pinned
    void api.patch<Note>(`/notes/${id}`, { pinned }).catch((err) => {
      set((s) => ({ notes: rollback(s.notes, id, prev) }))
      notifyError(err)
    })
  },

  addFocusSession: (input) => {
    const session: FocusSession = { ...input, id: uid(), startedAt: new Date().toISOString() }
    set((s) => ({ focusSessions: [...s.focusSessions, session] }))
    void api.post<FocusSession>('/focus-sessions', session).catch((err) => {
      set((s) => ({ focusSessions: s.focusSessions.filter((f) => f.id !== session.id) }))
      notifyError(err)
    })
  },

  updateSettings: (patch) => {
    const prev = get().settings
    const next = { ...prev, ...patch }
    set({ settings: next })
    void api.put<Settings>('/settings', next).catch((err) => {
      set({ settings: prev })
      notifyError(err)
    })
  },

  submitGameRecord: async (game, difficulty, value) => {
    try {
      const { isRecord } = await api.put<{ isRecord: boolean }>('/game-records', { game, difficulty, value })
      if (isRecord) {
        set((s) => ({
          gameRecords: { ...s.gameRecords, [game]: { ...s.gameRecords[game], [difficulty]: value } },
        }))
      }
      return isRecord
    } catch (err) {
      notifyError(err)
      return false
    }
  },

  hydrate: (state) => set({ ...state }),
  resetLocal: () => set({ ...EMPTY_STATE }),
}))
