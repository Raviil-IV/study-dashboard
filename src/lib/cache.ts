import { loadFromStorage, saveToStorage } from './storage'
import type { ServerState } from '../store/useStore'

const CACHE_KEY = 'study-dashboard:cache'

export function cacheState(state: ServerState): void {
  saveToStorage(CACHE_KEY, state)
}

export function loadCachedState(): ServerState | null {
  return loadFromStorage<ServerState | null>(CACHE_KEY, null)
}
