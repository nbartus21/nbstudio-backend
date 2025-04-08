import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic'
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
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    logLevel: 'info',
    logOverride: {
      'jsx-syntax-error': 'warning',
    }
  },
  logLevel: 'info'
})
