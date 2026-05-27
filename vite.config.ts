import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { renameSync } from 'fs'
import { resolve } from 'path'

// vite-plugin-dts emits index.d.ts based on the entry path, ignoring lib.fileName.
// Rename it after the build so the .d.ts filename matches the .js / .css files.
const renameTypesPlugin = () => ({
  name: 'rename-bundled-dts',
  closeBundle() {
    const dist = resolve(import.meta.dirname, 'dist')
    try {
      renameSync(`${dist}/index.d.ts`, `${dist}/non-dicom-importer.d.ts`)
    } catch {
      // file may not exist on incremental builds or test runs
    }
  },
})

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
    renameTypesPlugin(),
  ],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'non-dicom-importer',
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
