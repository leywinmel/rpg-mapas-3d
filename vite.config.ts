/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

type VercelConfig = {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

const CATCH_ALL_SOURCE = '/(.*)';
const CSP_HEADER = 'Content-Security-Policy';

/**
 * O `vite preview` serve os mesmos cabeçalhos de segurança da Vercel (lidos do `vercel.json`,
 * fonte única), para o CSP ser testado na máquina antes de publicar. Só a origem do Supabase
 * local entra a mais no `connect-src`, porque na nuvem o endereço é `*.supabase.co`.
 */
function previewHeaders(localSupabaseUrl: string | undefined): Record<string, string> {
  const raw = readFileSync(fileURLToPath(new URL('./vercel.json', import.meta.url)), 'utf8');
  const config = JSON.parse(raw) as VercelConfig;
  const catchAll = config.headers.find((entry) => entry.source === CATCH_ALL_SOURCE);
  if (!catchAll) return {};
  const headers = Object.fromEntries(catchAll.headers.map(({ key, value }) => [key, value]));
  if (!localSupabaseUrl || !headers[CSP_HEADER]) return headers;
  const localOrigins = `${localSupabaseUrl} ${localSupabaseUrl.replace(/^http/, 'ws')}`;
  headers[CSP_HEADER] = headers[CSP_HEADER].replace('connect-src', `connect-src ${localOrigins}`);
  return headers;
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Fora do node_modules: as worktrees compartilham o node_modules por junção, e dois servidores
  // escrevendo no mesmo cache de dependências deixam o React duplicado ("Invalid hook call").
  cacheDir: '.vite-cache',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: previewHeaders(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL),
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
}));
