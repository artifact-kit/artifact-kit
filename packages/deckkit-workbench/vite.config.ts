import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE ?? '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
