import { create } from 'zustand'

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
  useToast.getState().show(err instanceof Error ? err.message : 'Что-то пошло не так')
}
