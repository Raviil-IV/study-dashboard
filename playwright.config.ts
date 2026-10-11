import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // The scenarios share one session and must run in order against one stack.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  // The docker-compose stack is started externally; there is intentionally no webServer block.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
