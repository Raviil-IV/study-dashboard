import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client'

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') })
}
