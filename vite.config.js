import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base '/' — served from the domain root on Vercel.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own long-cached chunks.
        manualChunks: {
          'firebase-app': ['firebase/app', 'firebase/auth'],
          'firebase-data': ['firebase/firestore', 'firebase/storage'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
