import { app } from './app'
import { runMigrations } from './db/migrate'
import { pruneVisits } from './lib/prune'

const PORT = Number(process.env.PORT ?? 3000)
const PRUNE_INTERVAL_MS = 12 * 60 * 60 * 1000

async function main(): Promise<void> {
  await runMigrations()
  void pruneVisits()
  setInterval(() => void pruneVisits(), PRUNE_INTERVAL_MS)
  app.listen(PORT, () => {
    console.log(`Backend listening on :${PORT}`)
  })
}

main().catch((err) => {
  console.error('Backend failed to start', err)
  process.exit(1)
})