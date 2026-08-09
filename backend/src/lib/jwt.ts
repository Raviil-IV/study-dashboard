import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

export interface TokenPayload {
  userId: string
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload
}
