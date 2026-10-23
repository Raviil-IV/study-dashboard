import { create } from 'zustand'
import { ApiError } from './api'

interface ToastState {
  message: string | null
  show: (message: string) => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}))

export function notifyError(err: unknown): void {
  // the unauthorized handler owns the 401 UX; mutation catches must not overwrite its message
  if (err instanceof ApiError && err.status === 401) return
  useToast.getState().show(err instanceof Error ? err.message : 'Что-то пошло не так')
}
