import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/admin.nb-studio.net/fullchain.pem'),
    },
    proxy: {
      '/api': {
        target: 'https://admin.nb-studio.net:5001',
        secure: false,
        changeOrigin: true
      }
    }
  }
})