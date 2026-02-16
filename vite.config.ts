import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  root: '.',
  base: command === 'build' ? '/agent-armor/' : '/',
  build: {
    outDir: 'dist',
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
}));
