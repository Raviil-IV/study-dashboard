import { defineConfig } from 'vitest/config'

process.env.TEST_DATABASE_URL ??= 'postgres://postgres:postgres@localhost:5432/study_dashboard_test'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: './test/globalSetup.ts',
    setupFiles: ['./test/setup.ts'],
  },
})
