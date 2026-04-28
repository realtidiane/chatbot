import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During dev we proxy /api to the FastAPI backend so the frontend
// can `fetch('/api/chat')` without worrying about CORS.
//
// `host: true` binds the Vite dev server to 0.0.0.0 (every network
// interface) so you can open it from another device on your LAN
// (e.g. a phone). The proxy still targets localhost:8000 — Vite
// resolves it server-side, so the browser never sees the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})
