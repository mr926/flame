import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@flame-claude/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5005',
      '/uploads': 'http://localhost:5005',
    },
  },
  build: {
    outDir: 'dist',
  },
});
