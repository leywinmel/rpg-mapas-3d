/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    // Regras puras rodam em Node (rápido); componentes pedem jsdom no próprio arquivo
    // com o comentário `// @vitest-environment jsdom`.
    environment: 'node',
    // Threads iniciam mais rápido que processos no Windows, sobretudo com o Docker ocupando a máquina.
    pool: 'threads',
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
