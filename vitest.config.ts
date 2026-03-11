import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/unit/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, './backend/src'),
      '@frontend': path.resolve(__dirname, './frontend/src'),
    },
  },
})
