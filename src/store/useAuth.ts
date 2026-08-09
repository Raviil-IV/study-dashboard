import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import { cacheState, loadCachedState } from '../lib/cache'
import { useStore, type ServerState } from './useStore'

export type AuthStatus = 'loading' | 'guest' | 'authed' | 'offline'

interface AuthState {
  user: { id: string; login: string } | null
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
      const user = await api.get<{ id: string; login: string }>('/auth/me')
      const state = await api.get<ServerState>('/state')
      useStore.getState().hydrate(state)
      cacheState(state)
      set({ user, status: 'authed' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
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
    const user = await api.post<{ id: string; login: string }>('/auth/login', { login, password })
    const state = await api.get<ServerState>('/state')
    useStore.getState().hydrate(state)
    cacheState(state)
    set({ user, status: 'authed' })
  },

  register: async (login, password) => {
    const user = await api.post<{ id: string; login: string }>('/auth/register', { login, password })
    set({ user, status: 'authed' })
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {})
    useStore.getState().resetLocal()
    set({ user: null, status: 'guest' })
  },
}))
