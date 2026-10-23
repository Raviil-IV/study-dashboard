import { describe, expect, it, beforeEach, vi } from 'vitest'
import { api, ApiError } from '../lib/api'
import type { Settings } from '../types'
import { useAuth, handleUnauthorized } from './useAuth'
import { useStore, type ServerState } from './useStore'
import { usePomodoroStore } from './usePomodoroStore'

const { hydrateMock, resetLocalMock, loadCachedMock, cacheStateMock, clearCachedMock, showToastMock, initialSlice } = vi.hoisted(() => ({
  hydrateMock: vi.fn(),
  resetLocalMock: vi.fn(),
  loadCachedMock: vi.fn<() => unknown>(() => null),
  cacheStateMock: vi.fn(),
  clearCachedMock: vi.fn(),
  showToastMock: vi.fn(),
  initialSlice: {
    lessons: [],
    tasks: [],
    deadlines: [],
    notes: [],
    focusSessions: [],
    settings: { theme: 'dark', pomodoroWorkMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 },
    gameRecords: { memory: {}, snake: {}, minesweeper: {} },
  } as ServerState,
}))

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }
})
vi.mock('../lib/cache', () => ({
  cacheState: (...args: unknown[]) => cacheStateMock(...args),
  clearCachedState: () => clearCachedMock(),
  loadCachedState: () => loadCachedMock(),
}))
vi.mock('./useStore', async () => {
  const { create } = await import('zustand')
  return { useStore: create(() => ({ ...initialSlice, hydrate: hydrateMock, resetLocal: resetLocalMock })) }
})
vi.mock('../lib/toast', () => ({
  notifyError: vi.fn(),
  useToast: { getState: () => ({ show: showToastMock }) },
}))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

const SETTINGS_50: Settings = { theme: 'dark', pomodoroWorkMinutes: 50, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15 }

beforeEach(() => {
  useAuth.setState({ user: null, status: 'loading' })
  useStore.setState({ ...initialSlice })
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('check() authenticates and loads state', async () => {
    mockedGet.mockResolvedValueOnce({ id: 'u1', login: 'alice' }).mockResolvedValueOnce({ lessons: [] })
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('authed')
    expect(hydrateMock).toHaveBeenCalled()
    expect(cacheStateMock).toHaveBeenCalled()
  })

  it('check() goes to guest on 401', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Требуется вход'))
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('guest')
  })

  it('check() clears the cache on 401 so an expired session cannot leak into a later offline start', async () => {
    mockedGet.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Требуется вход'))
    await useAuth.getState().check()
    expect(clearCachedMock).toHaveBeenCalled()
  })

  it('check() goes offline with cached data on network error', async () => {
    mockedGet.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    loadCachedMock.mockReturnValueOnce({ lessons: [] })
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('offline')
    expect(hydrateMock).toHaveBeenCalled()
  })

  it('check() goes to guest on network error without cache', async () => {
    mockedGet.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await useAuth.getState().check()
    expect(useAuth.getState().status).toBe('guest')
  })

  it('login() authenticates and loads state', async () => {
    mockedPost.mockResolvedValueOnce({ id: 'u1', login: 'alice' })
    mockedGet.mockResolvedValueOnce({ lessons: [] })
    await useAuth.getState().login('alice', 'password123')
    expect(useAuth.getState().status).toBe('authed')
    expect(mockedPost).toHaveBeenCalledWith('/auth/login', { login: 'alice', password: 'password123' })
  })

  it('login() propagates ApiError message', async () => {
    mockedPost.mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'Неверный логин или пароль'))
    await expect(useAuth.getState().login('alice', 'wrong')).rejects.toThrow('Неверный логин или пароль')
  })

  it('logout() resets local state, clears the cache and returns to guest', async () => {
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(useAuth.getState().status).toBe('guest')
    expect(resetLocalMock).toHaveBeenCalled()
    expect(clearCachedMock).toHaveBeenCalled()
  })

  it('logout() clears the cache only after resetting the store', async () => {
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(clearCachedMock.mock.invocationCallOrder[0]).toBeGreaterThan(resetLocalMock.mock.invocationCallOrder[0])
  })

  it('logout() posts /auth/logout and clears the user', async () => {
    useAuth.setState({ user: { id: 'u1', login: 'alice', role: 'user' }, status: 'authed' })
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(mockedPost).toHaveBeenCalledWith('/auth/logout', {})
    expect(useAuth.getState().user).toBeNull()
  })

  it('logout() discards a running pomodoro session so it is not recorded for the next user', async () => {
    useAuth.setState({ user: { id: 'u1', login: 'alice', role: 'user' }, status: 'authed' })
    usePomodoroStore.setState({ isRunning: true, sessionCount: 2, subject: 'Math', secondsLeft: 100 })
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(usePomodoroStore.getState()).toMatchObject({ isRunning: false, sessionCount: 0, subject: '' })
  })

  it('handleUnauthorized() ends an authed session, resets local state, clears the cache and shows a toast', () => {
    useAuth.setState({ user: { id: 'u1', login: 'alice', role: 'user' }, status: 'authed' })
    handleUnauthorized()
    expect(useAuth.getState().status).toBe('guest')
    expect(useAuth.getState().user).toBeNull()
    expect(resetLocalMock).toHaveBeenCalled()
    expect(clearCachedMock).toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith('Сессия истекла, войдите снова')
  })

  it('handleUnauthorized() discards a running pomodoro session when ending an authed session', () => {
    useAuth.setState({ user: { id: 'u1', login: 'alice', role: 'user' }, status: 'authed' })
    usePomodoroStore.setState({ isRunning: true, sessionCount: 2, subject: 'Math', secondsLeft: 100 })
    handleUnauthorized()
    expect(usePomodoroStore.getState()).toMatchObject({ isRunning: false, sessionCount: 0, subject: '' })
  })

  it('handleUnauthorized() leaves a running pomodoro session alone while guest', () => {
    useAuth.setState({ user: null, status: 'guest' })
    usePomodoroStore.setState({ isRunning: true, sessionCount: 2, subject: 'Math', secondsLeft: 100 })
    handleUnauthorized()
    expect(usePomodoroStore.getState()).toMatchObject({ isRunning: true, sessionCount: 2, subject: 'Math' })
  })

  it.each(['loading', 'guest'] as const)('handleUnauthorized() is a no-op while status is %s', (status) => {
    useAuth.setState({ user: null, status })
    handleUnauthorized()
    expect(useAuth.getState().status).toBe(status)
    expect(resetLocalMock).not.toHaveBeenCalled()
    expect(clearCachedMock).not.toHaveBeenCalled()
    expect(showToastMock).not.toHaveBeenCalled()
  })

  it('writes the server-state slice to the cache when the store changes while authed', () => {
    useAuth.setState({ user: { id: 'u1', login: 'alice', role: 'user' }, status: 'authed' })
    useStore.setState({ settings: SETTINGS_50 })
    expect(cacheStateMock).toHaveBeenLastCalledWith({ ...initialSlice, settings: SETTINGS_50 })
  })

  it.each(['loading', 'guest', 'offline'] as const)('does not write the cache when the store changes while status is %s', (status) => {
    useAuth.setState({ user: null, status })
    useStore.setState({ settings: SETTINGS_50 })
    expect(cacheStateMock).not.toHaveBeenCalled()
  })
})
