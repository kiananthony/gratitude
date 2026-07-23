import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
      <Analytics />
    </AppProvider>
  </StrictMode>
);

// Service worker: caches images/fonts for speed, and makes sure a new deploy
// shows up without the person needing to close and reopen the app.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        // Periodically check for a new deploy. With registerType 'autoUpdate',
        // vite-plugin-pwa activates the new worker and reloads the page ONCE on
        // its own (with a built-in guard). We deliberately do NOT call reload()
        // ourselves here: reloading without activating the waiting worker leaves
        // it waiting, so it's detected again on the next load, which spirals into
        // a reload loop that makes the page appear frozen/unclickable.
        const check = () => { try { registration.update(); } catch { /* ignore */ } };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        setInterval(check, 30 * 60 * 1000);
      },
    });
    void updateSW;
  }).catch(() => { /* service worker unsupported/blocked, app still works normally */ });
}

