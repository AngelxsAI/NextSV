import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/database/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 240000,
    pool: 'forks',
    maxWorkers: 1,
  },
});
