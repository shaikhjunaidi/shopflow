import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// If Render Blueprint injects the internal backend host, format it properly as a public URL
if (process.env.VITE_API_HOST) {
  let host = process.env.VITE_API_HOST.split(':')[0]; // strip port if any
  if (!host.includes('.onrender.com') && !host.includes('localhost')) {
    host = `${host}.onrender.com`;
  }
  process.env.VITE_API_URL = `https://${host}`;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
