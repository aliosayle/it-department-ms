import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Listen on all addresses (e.g. 0.0.0.0) so other machines on the LAN can open the dev URL.
  server: {
    host: true,
    proxy: {
      // When `VITE_API_BASE_URL=/api/v1`, dev requests hit the local API on port 4000.
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
