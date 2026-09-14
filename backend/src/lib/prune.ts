import { lt } from 'drizzle-orm'
import { db } from '../db/client'
import { visits } from '../db/schema'

export const VISITS_RETENTION_DAYS = 7

/** Удаляет визиты старше 7 дней, возвращает количество удалённых строк. */
export async function pruneVisits(): Promise<number> {
  const cutoff = new Date(Date.now() - VISITS_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const rows = await db.delete(visits).where(lt(visits.visitedAt, cutoff.toISOString())).returning({ id: visits.id })
  return rows.length
}