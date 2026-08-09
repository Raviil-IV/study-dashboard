import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/globalSetup.ts',
    setupFiles: ['./test/setup.ts'],
    env: {
      TEST_DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/study_dashboard_test',
    },
  },
})
