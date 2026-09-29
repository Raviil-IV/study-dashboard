import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uid } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uid', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('without crypto.randomUUID (insecure context)', () => {
    beforeEach(() => {
      vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    })

    it('returns a valid RFC 4122 UUID v4', () => {
      expect(uid()).toMatch(UUID_V4)
    })

    it('returns different values on consecutive calls', () => {
      expect(uid()).not.toBe(uid())
    })
  })

  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '7b2f9c1e-5a3d-4e8b-9c4f-1d6a2b3c4d5e')
    vi.stubGlobal('crypto', { randomUUID })

    expect(uid()).toBe('7b2f9c1e-5a3d-4e8b-9c4f-1d6a2b3c4d5e')
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })
})
