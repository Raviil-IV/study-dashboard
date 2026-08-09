import { app } from './app'
import { runMigrations } from './db/migrate'

const PORT = Number(process.env.PORT ?? 3000)

async function main(): Promise<void> {
  await runMigrations()
  app.listen(PORT, () => {
    console.log(`Backend listening on :${PORT}`)
  })
}

main().catch((err) => {
  console.error('Backend failed to start', err)
  process.exit(1)
})
