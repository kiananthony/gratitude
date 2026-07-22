import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);

// Service worker: caches images/fonts for speed, and makes sure a new deploy
// shows up without the person needing to close and reopen the app.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      // A new version was found and (with registerType: 'autoUpdate') has
      // already taken over, reload so the running page picks it up right away
      // instead of only updating on the next full relaunch.
      onNeedRefresh() { window.location.reload(); },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        // Also check for a new version whenever the app is brought back to
        // the foreground, since a long-lived open tab otherwise only checks
        // for updates occasionally on its own.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update();
        });
        setInterval(() => registration.update(), 5 * 60 * 1000);
      },
    });
    void updateSW;
  }).catch(() => { /* service worker unsupported/blocked, app still works normally */ });
}

