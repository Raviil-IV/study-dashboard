import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('GETs JSON from /api prefixed path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ hello: 'world' }) }))
    const result = await api.get<{ hello: string }>('/state')
    expect(result).toEqual({ hello: 'world' })
    expect(fetch).toHaveBeenCalledWith('/api/state', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('throws ApiError with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Время конца должно быть позже времени начала' } }),
      }),
    )
    await expect(api.post('/lessons', {})).rejects.toMatchObject({ status: 400, message: 'Время конца должно быть позже времени начала' })
  })

  it('throws ApiError with a generic message when body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('parse') } }))
    await expect(api.get('/state')).rejects.toBeInstanceOf(ApiError)
  })

  it('dispatches auth:unauthorized on 401', async () => {
    const dispatched = vi.fn()
    window.addEventListener('auth:unauthorized', dispatched)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'Требуется вход' } }) }))
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(dispatched).toHaveBeenCalledTimes(1)
  })

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    const result = await api.delete('/lessons/abc')
    expect(result).toBeUndefined()
  })
})
