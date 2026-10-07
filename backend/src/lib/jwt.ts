import jwt from 'jsonwebtoken'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production')
}

export const DEV_JWT_SECRET = 'dev-secret-change-me'

const SECRET = process.env.JWT_SECRET ?? DEV_JWT_SECRET

export interface TokenPayload {
  userId: string
  tv?: number
}

export function signToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ userId, tv: tokenVersion }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload
}
