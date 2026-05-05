import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['unit/**/*.test.ts', 'api/**/*.test.ts', 'contract/**/*.test.ts'],
    reporters: ['default', ['json', { outputFile: '_report/vitest.json' }]],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: true,
    environment: 'node',
  },
});
