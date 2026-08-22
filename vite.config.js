import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/teaching-platform/',
  server: { port: 5180, open: true }
})
