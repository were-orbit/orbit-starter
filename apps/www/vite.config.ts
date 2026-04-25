import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: { port: 4000 },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})
