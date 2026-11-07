/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Response headers come from vercel.json (the production source of truth), so `npm run preview`
 * serves the build with the same headers Vercel will, including the CSP frame-ancestors list
 * for embedding in the LagosLife Games player.
 */
function vercelHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[];
  };
  const all = config.headers?.find((h) => h.source === '/(.*)');
  return Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]));
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  preview: { headers: vercelHeaders() },
  build: {
    target: ['es2020', 'safari15', 'ios15'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
