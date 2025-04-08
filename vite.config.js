import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

// ESM-ben a __dirname nincsen definiálva, ezért manuálisan kell létrehoznunk
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    jsxImportSource: 'react'
  })],
  server: {
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    logLevel: 'warning',
    logOverride: {
      'jsx-syntax-error': 'error',
    }
  },
  logLevel: 'info'
})
