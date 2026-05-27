import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Read VITE_* vars from .env / .env.local so the dev server can proxy XNAT.
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  const xnatTarget = env.VITE_XNAT_BASE_URL

  return {
  plugins: [
    tailwindcss(),
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      rollupTypes: true,
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    cssCodeSplit: false,
  },
  // Dev-only: when VITE_XNAT_BASE_URL is set, proxy /data and /xapi to that
  // XNAT instance so the browser sees everything as same-origin (no CORS).
  // Production builds do not ship this — server.proxy is dev-server only.
  server: xnatTarget
    ? {
        proxy: {
          '/data': { target: xnatTarget, changeOrigin: true },
          '/xapi': { target: xnatTarget, changeOrigin: true },
        },
      }
    : undefined,
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/components/**/*.{ts,tsx}'],
      exclude: ['src/components/**/*.test.{ts,tsx}', 'src/components/**/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  }
})
