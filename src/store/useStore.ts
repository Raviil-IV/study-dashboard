import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { Deadline, FocusSession, Lesson, Note, Settings, Task } from '../types'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../lib/constants'
import type { GameId, GameDifficulty, GameRecord } from '../lib/games/types'
import { EMPTY_GAME_RECORDS } from '../lib/games/types'
import { getDemoData } from '../lib/demoData'
import { loadFromStorage } from '../lib/storage'
import { currentWeekMonday, toISODate } from '../lib/date'
import { uid } from '../lib/id'

export type TaskInput = Omit<Task, 'id' | 'createdAt'>

export interface StoreState {
  lessons: Lesson[]
  tasks: Task[]
  deadlines: Deadline[]
  notes: Note[]
  focusSessions: FocusSession[]
  settings: Settings
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
  addNote: (input: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  removeNote: (id: string) => void
  togglePinNote: (id: string) => void
  addFocusSession: (input: Omit<FocusSession, 'id' | 'startedAt'>) => void
  updateSettings: (patch: Partial<Settings>) => void
  gameRecords: GameRecord
  submitGameRecord: (game: GameId, difficulty: GameDifficulty, value: number) => boolean
  resetAll: () => void
  clearAll: () => void
}

type PersistedState = Pick<StoreState, 'lessons' | 'tasks' | 'deadlines' | 'notes' | 'focusSessions' | 'settings' | 'gameRecords'>

// Legacy records lack `type`; one-off lessons from a previous calendar week are dropped.
function migrateState(state: PersistedState): PersistedState {
  const monday = toISODate(currentWeekMonday())
  return {
    ...state,
    lessons: state.lessons
      .map((l) => ({ ...l, type: l.type ?? 'weekly' }))
      .filter((l) => !(l.type === 'once' && l.date && l.date < monday)),
  }
}

const keys = STORAGE_KEYS

const emptyState: PersistedState = {
  lessons: [],
  tasks: [],
  deadlines: [],
  notes: [],
  focusSessions: [],
  settings: DEFAULT_SETTINGS,
  gameRecords: EMPTY_GAME_RECORDS,
}

function seedState(): PersistedState {
  const d = getDemoData()
  return { lessons: d.lessons, tasks: d.tasks, deadlines: d.deadlines, notes: d.notes, focusSessions: [], settings: DEFAULT_SETTINGS, gameRecords: EMPTY_GAME_RECORDS }
}

// Zustand v5 `persist` expects a PersistStorage: getItem returns
// `{ state, version } | null`, setItem receives the same object. State is
// stored split per-entity (see STORAGE_KEYS), so this storage fans the
// umbrella record out into individual localStorage keys and reassembles it.
const storage: PersistStorage<PersistedState> = {
  getItem: (name) => {
    // Umbrella key written by zustand's default JSON storage — read as-is.
    const raw = localStorage.getItem(name)
    if (raw) {
      const parsed = JSON.parse(raw) as { state: PersistedState }
      return { ...parsed, state: migrateState(parsed.state) }
    }
    // First run: nothing stored anywhere → keep the seeded demo data.
    if (Object.values(keys).every((k) => localStorage.getItem(k) === null)) return null
    return {
      state: migrateState({
        lessons: loadFromStorage<Lesson[]>(keys.lessons, []),
        tasks: loadFromStorage<Task[]>(keys.tasks, []),
        deadlines: loadFromStorage<Deadline[]>(keys.deadlines, []),
        notes: loadFromStorage<Note[]>(keys.notes, []),
        focusSessions: loadFromStorage<FocusSession[]>(keys.focusSessions, []),
        settings: loadFromStorage<Settings>(keys.settings, DEFAULT_SETTINGS),
        gameRecords: loadFromStorage<GameRecord>(keys.gameRecords, EMPTY_GAME_RECORDS),
      }),
      version: 0,
    }
  },
  setItem: (_name, value) => {
    const s = value.state
    localStorage.setItem(keys.lessons, JSON.stringify(s.lessons))
    localStorage.setItem(keys.tasks, JSON.stringify(s.tasks))
    localStorage.setItem(keys.deadlines, JSON.stringify(s.deadlines))
    localStorage.setItem(keys.notes, JSON.stringify(s.notes))
    localStorage.setItem(keys.focusSessions, JSON.stringify(s.focusSessions))
    localStorage.setItem(keys.settings, JSON.stringify(s.settings))
    localStorage.setItem(keys.gameRecords, JSON.stringify(s.gameRecords))
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    Object.values(keys).forEach((k) => localStorage.removeItem(k))
  },
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...seedState(),
      settings: DEFAULT_SETTINGS,
      addLesson: (input) =>
        set((s) => ({ lessons: [...s.lessons, { ...input, id: uid() }] })),
      updateLesson: (id, patch) =>
        set((s) => ({ lessons: s.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLesson: (id) => set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),
      addTask: (input) =>
        set((s) => ({
          tasks: [...s.tasks, { ...input, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? t.status === 'done'
                ? { ...t, status: 'todo' as const, completedAt: undefined }
                : { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
              : t,
          ),
        })),
      addDeadline: (input) =>
        set((s) => ({ deadlines: [...s.deadlines, { ...input, id: uid(), createdAt: new Date().toISOString() }] })),
      updateDeadline: (id, patch) =>
        set((s) => ({ deadlines: s.deadlines.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDeadline: (id) => set((s) => ({ deadlines: s.deadlines.filter((d) => d.id !== id) })),
      addNote: (input) =>
        set((s) => ({ notes: [...s.notes, { ...input, id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] })),
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
          ),
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      togglePinNote: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),
      addFocusSession: (input) =>
        set((s) => ({ focusSessions: [...s.focusSessions, { ...input, id: uid(), startedAt: new Date().toISOString() }] })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      submitGameRecord: (game, difficulty, value) => {
        let isRecord = false
        set((s) => {
          const current = s.gameRecords[game]?.[difficulty]
          const isBetter = current === undefined || (game === 'snake' ? value > current : value < current)
          if (!isBetter) return {}
          isRecord = true
          return {
            gameRecords: {
              ...s.gameRecords,
              [game]: { ...s.gameRecords[game], [difficulty]: value },
            },
          }
        })
        return isRecord
      },
      resetAll: () => set(() => ({ ...seedState(), settings: DEFAULT_SETTINGS })),
      clearAll: () => set(() => ({ ...emptyState, settings: DEFAULT_SETTINGS })),
    }),
    {
      name: 'study-dashboard',
      partialize: (state): PersistedState => ({
        lessons: state.lessons,
        tasks: state.tasks,
        deadlines: state.deadlines,
        notes: state.notes,
        focusSessions: state.focusSessions,
        settings: state.settings,
        gameRecords: state.gameRecords,
      }),
      storage,
    },
  ),
)
