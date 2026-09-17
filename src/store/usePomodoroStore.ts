import { create } from 'zustand'
import { useStore } from './useStore'

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak'

const MODE_SECONDS = (
  settings: { pomodoroWorkMinutes: number; pomodoroShortBreakMinutes: number; pomodoroLongBreakMinutes: number },
  mode: PomodoroMode,
) => {
  if (mode === 'work') return settings.pomodoroWorkMinutes * 60
  if (mode === 'shortBreak') return settings.pomodoroShortBreakMinutes * 60
  return settings.pomodoroLongBreakMinutes * 60
}

export interface PomodoroState {
  mode: PomodoroMode
  secondsLeft: number
  isRunning: boolean
  sessionCount: number
  subject: string
  setMode: (mode: PomodoroMode) => void
  setSubject: (subject: string) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  syncDurations: () => void
  resetAll: () => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  mode: 'work',
  secondsLeft: MODE_SECONDS(useStore.getState().settings, 'work'),
  isRunning: false,
  sessionCount: 0,
  subject: '',

  setMode: (mode) =>
    set({ mode, secondsLeft: MODE_SECONDS(useStore.getState().settings, mode), isRunning: false }),
  setSubject: (subject) => set({ subject }),
  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),
  reset: () =>
    set({ isRunning: false, secondsLeft: MODE_SECONDS(useStore.getState().settings, get().mode) }),

  // decrement one second; transition to the next mode when zero is reached
  tick: () => {
    const { secondsLeft, mode, subject } = get()
    if (secondsLeft > 1) {
      set({ secondsLeft: secondsLeft - 1 })
      return
    }
    const wasWork = mode === 'work'
    const settings = useStore.getState().settings
    if (wasWork) {
      set({ sessionCount: get().sessionCount + 1 })
      useStore.getState().addFocusSession({
        label: subject || 'Фокус',
        subject: subject || undefined,
        durationMinutes: settings.pomodoroWorkMinutes,
        completed: true,
      })
    }
    const nextMode: PomodoroMode = wasWork ? 'shortBreak' : 'work'
    set({ mode: nextMode, secondsLeft: MODE_SECONDS(settings, nextMode), isRunning: false })
  },

  // resync duration when settings change, only while paused
  syncDurations: () => {
    if (!get().isRunning) {
      set({ secondsLeft: MODE_SECONDS(useStore.getState().settings, get().mode) })
    }
  },

  resetAll: () =>
    set({
      mode: 'work',
      secondsLeft: MODE_SECONDS(useStore.getState().settings, 'work'),
      isRunning: false,
      sessionCount: 0,
      subject: '',
    }),
}))
