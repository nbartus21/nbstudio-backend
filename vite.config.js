import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

// ESM-ben a __dirname nincsen definiálva, ezért manuálisan kell létrehoznunk
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react({
    babel: {
      babelrc: false,
      configFile: false,
      plugins: []
    }
  })],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://admin.nb-studio.net:5001',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  optimizeDeps: {
    force: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: {
    jsx: 'automatic',
    jsxInject: `import React from 'react'`,
    logLevel: 'warning'
  },
  logLevel: 'info'
})
