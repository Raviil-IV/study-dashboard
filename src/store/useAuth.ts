import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import { cacheState, clearCachedState, loadCachedState } from '../lib/cache'
import { useToast } from '../lib/toast'
import { useStore, type ServerState } from './useStore'
import { usePomodoroStore } from './usePomodoroStore'
import type { Role, User } from '../types'

export type AuthStatus = 'loading' | 'guest' | 'authed' | 'offline'

interface AuthState {
  user: User | null
  status: AuthStatus
  check: () => Promise<void>
  login: (login: string, password: string) => Promise<void>
  register: (login: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  check: async () => {
    if (get().status !== 'loading') return
    try {
      const user = await api.get<{ id: string; login: string; role: Role }>('/auth/me')
      const state = await api.get<ServerState>('/state')
      useStore.getState().hydrate(state)
      cacheState(state)
      set({ user, status: 'authed' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearCachedState()
        set({ user: null, status: 'guest' })
        return
      }
      const cached = loadCachedState()
      if (cached) {
        useStore.getState().hydrate(cached)
        set({ user: null, status: 'offline' })
      } else {
        set({ user: null, status: 'guest' })
      }
    }
  },

  login: async (login, password) => {
    const user = await api.post<{ id: string; login: string; role: Role }>('/auth/login', { login, password })
    const state = await api.get<ServerState>('/state')
    useStore.getState().hydrate(state)
    cacheState(state)
    set({ user, status: 'authed' })
  },

  register: async (login, password) => {
    const user = await api.post<{ id: string; login: string; role: Role }>('/auth/register', { login, password })
    set({ user, status: 'authed' })
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {})
    endSession()
  },
}))

function endSession(): void {
  useStore.getState().resetLocal()
  // a session left running would otherwise be recorded under the next user's account
  usePomodoroStore.getState().resetAll()
  // resetLocal fires the cache subscription below while status is still 'authed', so clear after it
  clearCachedState()
  useAuth.setState({ user: null, status: 'guest' })
}

useStore.subscribe((state) => {
  if (useAuth.getState().status !== 'authed') return
  cacheState({
    lessons: state.lessons,
    tasks: state.tasks,
    deadlines: state.deadlines,
    notes: state.notes,
    focusSessions: state.focusSessions,
    settings: state.settings,
    gameRecords: state.gameRecords,
  })
})

export function handleUnauthorized(): void {
  if (useAuth.getState().status !== 'authed') return
  endSession()
  useToast.getState().show('Сессия истекла, войдите снова')
}
