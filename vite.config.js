import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('/root/ssl/private.key'),
      cert: fs.readFileSync('/root/ssl/certificate.crt'),
    },
    proxy: {
      '/api': {
        target: 'https://admin.nb-studio.net:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})