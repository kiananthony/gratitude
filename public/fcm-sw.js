/* Firebase Cloud Messaging background handler.
 *
 * This file is importScripts()-ed into the generated Workbox service worker
 * (see vite.config.js → workbox.importScripts), so the app runs a SINGLE
 * service worker that does both offline caching and background push — avoiding
 * the scope conflict two separate service workers would cause.
 *
 * It shows a notification when a push arrives while the app is closed/backgrounded.
 * If you change the Firebase project, update the config below to match src/firebase.js.
 */
/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAIQM3lhJDK9Ksy9Jk4i3P4Sc-xoWgOL4M',
  authDomain: 'milestonedev-gratitude.firebaseapp.com',
  projectId: 'milestonedev-gratitude',
  storageBucket: 'milestonedev-gratitude.firebasestorage.app',
  messagingSenderId: '44719069967',
  appId: '1:44719069967:web:d0da63764c2de486773c7a',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(n.title || 'Gratitude', {
    body: n.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: { url: data.url || '/' },
  });
});

// Focus/open the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
