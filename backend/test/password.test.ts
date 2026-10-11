import { describe, expect, it } from 'vitest'
import { verifyPassword } from '../src/lib/password'

// Hash generated with bcrypt@5.1.1 (cost 12) for 'password123'.
// Pinned before the bcrypt@6 upgrade to guard against hash-format regressions.
const PASSWORD123_HASH = '$2b$12$9KBe5woR4nzIOLehpIsIuu8EqK/uANbAQ/iJJN288UdR2uMOaGWSW'

describe('password hash compatibility', () => {
  it('verifies the pinned bcrypt@5 hash for password123', async () => {
    await expect(verifyPassword('password123', PASSWORD123_HASH)).resolves.toBe(true)
  })

  it('rejects a wrong password against the pinned hash', async () => {
    await expect(verifyPassword('wrong-password', PASSWORD123_HASH)).resolves.toBe(false)
  })
})
