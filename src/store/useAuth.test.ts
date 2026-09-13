import { describe, expect, it, beforeEach, vi } from 'vitest'
import { api, ApiError } from '../lib/api'
import { useAuth } from './useAuth'

const { hydrateMock, resetLocalMock, loadCachedMock, cacheStateMock } = vi.hoisted(() => ({
  hydrateMock: vi.fn(),
  resetLocalMock: vi.fn(),
  loadCachedMock: vi.fn<() => unknown>(() => null),
  cacheStateMock: vi.fn(),
}))

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }
})
vi.mock('../lib/cache', () => ({
  cacheState: (...args: unknown[]) => cacheStateMock(...args),
  loadCachedState: () => loadCachedMock(),
}))
vi.mock('./useStore', () => ({ useStore: { getState: () => ({ hydrate: hydrateMock, resetLocal: resetLocalMock }) } }))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.setState({ user: null, status: 'loading' })
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

  it('logout() resets local state and returns to guest', async () => {
    mockedPost.mockResolvedValueOnce(undefined)
    await useAuth.getState().logout()
    expect(useAuth.getState().status).toBe('guest')
    expect(resetLocalMock).toHaveBeenCalled()
  })
})
