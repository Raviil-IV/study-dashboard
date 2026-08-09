import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import { cacheState, loadCachedState } from '../lib/cache'
import { useStore, type ServerState } from './useStore'

export type AuthStatus = 'loading' | 'guest' | 'authed' | 'offline'

interface AuthState {
  user: { id: string; email: string } | null
  status: AuthStatus
  check: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  check: async () => {
    if (get().status !== 'loading') return
    try {
      const user = await api.get<{ id: string; email: string }>('/auth/me')
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

  login: async (email, password) => {
    const user = await api.post<{ id: string; email: string }>('/auth/login', { email, password })
    const state = await api.get<ServerState>('/state')
    useStore.getState().hydrate(state)
    cacheState(state)
    set({ user, status: 'authed' })
  },

  register: async (email, password) => {
    const user = await api.post<{ id: string; email: string }>('/auth/register', { email, password })
    set({ user, status: 'authed' })
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {})
    useStore.getState().resetLocal()
    set({ user: null, status: 'guest' })
  },
}))
