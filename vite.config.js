import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
// base '/' — served from the domain root on Vercel.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We already hand-author public/manifest.json (linked in index.html)
      // and it's tailored to the app already, so let the plugin focus purely
      // on the service worker rather than generating its own manifest too.
      manifest: false,
      injectRegister: false, // registered manually in main.jsx, see registerSW()
      registerType: 'autoUpdate',
      workbox: {
        // Merge the FCM background-message handler into this single service
        // worker (avoids the scope conflict of registering a second SW).
        importScripts: ['/fcm-sw.js'],
        // skipWaiting + clientsClaim so a newly-deployed service worker takes
        // over immediately instead of waiting for every tab to close first —
        // combined with the reload-on-update logic in main.jsx, this is what
        // makes a new deploy show up without the person having to relaunch.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Profile photos and post photos, served from Firebase Storage.
            // Stale-while-revalidate: show the cached copy instantly, then
            // quietly refetch in the background so an updated photo still
            // catches up within a request or two instead of being stuck forever.
            urlPattern: ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gratitude-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — cache-first since these are effectively immutable.
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'gratitude-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
