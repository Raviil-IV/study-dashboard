import path from 'node:path'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

export default async function globalSetup(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/study_dashboard_test'
  const url = new URL(testUrl)
  const dbName = url.pathname.slice(1)

  const admin = new Pool({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: url.username || 'postgres',
    password: url.password || undefined,
    database: 'postgres',
  })
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
  if (rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  const db = drizzle(new Pool({ connectionString: testUrl }))
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'drizzle') })
  await db.$client.end()
}
