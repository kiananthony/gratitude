import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base '/' — served from the domain root on Vercel.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
