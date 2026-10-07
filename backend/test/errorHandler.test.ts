import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { errorHandler } from '../src/middleware/error'

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

const call = (err: unknown) => {
  const res = mockRes()
  errorHandler(err, {} as Request, res as unknown as Response, (() => {}) as NextFunction)
  return res
}

describe('errorHandler: unique violations (23505)', () => {
  it('maps the users login constraint to LOGIN_TAKEN', () => {
    const res = call({ code: '23505', constraint: 'users_email_unique' })
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'LOGIN_TAKEN', message: 'Логин уже занят' } })
  })

  it('maps any other unique violation to CONFLICT', () => {
    const res = call({ code: '23505', constraint: 'lessons_pkey' })
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Запись с таким идентификатором уже существует' },
    })
  })
})
