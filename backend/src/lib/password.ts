import bcrypt from 'bcrypt'

const COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
