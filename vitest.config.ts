import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // happy-dom：renderer 持久化 / DOMPurify；主进程 guard 也在此环境跑
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/shared/**/*.test.ts'],
    pool: 'forks'
  }
});
