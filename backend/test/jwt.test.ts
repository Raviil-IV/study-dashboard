import { afterEach, describe, expect, it, vi } from 'vitest'

const savedNodeEnv = process.env.NODE_ENV
const savedJwtSecret = process.env.JWT_SECRET

describe('JWT secret configuration', () => {
  afterEach(() => {
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = savedNodeEnv
    if (savedJwtSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = savedJwtSecret
    vi.resetModules()
  })

  it('refuses to load in production when JWT_SECRET is not set', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.JWT_SECRET
    vi.resetModules()
    await expect(import('../src/lib/jwt')).rejects.toThrow('JWT_SECRET')
  })
})
