import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'cli/**/*.test.ts', 'scripts/actions/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
  },
})
