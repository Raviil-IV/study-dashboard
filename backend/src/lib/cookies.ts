import type { Response } from 'express'
import { signToken } from './jwt'

export const COOKIE_NAME = 'auth_token'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}
