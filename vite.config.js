import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

// ESM-ben a __dirname nincsen definiálva, ezért manuálisan kell létrehoznunk
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    hmr: {
      overlay: false
    },
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
    esbuildOptions: {
      jsx: 'automatic',
      loader: {
        '.js': 'jsx'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
    jsx: 'automatic'
  },
  logLevel: 'info'
})
