import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 主进程单测不跑 electron 真机
    pool: 'forks'
  }
});
