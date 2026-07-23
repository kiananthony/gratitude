// Client-side Web Push (Firebase Cloud Messaging) helper.
//
// Flow: ask the browser for notification permission, obtain an FCM token bound
// to our service worker, and store it under users/{uid}/fcmTokens/{token} so the
// Cloud Functions can send to every device the person has enabled. We use a
// subcollection (not the single `fcmToken` field the iOS app uses) so web and
// iOS tokens coexist and multiple browsers/devices all receive pushes.

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, VAPID_KEY, getMessagingIfSupported } from './firebase.js';

const LOCAL_TOKEN_KEY = 'gratitude.fcmToken';

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

// Best-effort current timezone, stored on the user doc so the daily-reminder
// Cloud Function can fire at the right local time.
export function currentTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

// Ask permission (if not already decided) and register a token for this device.
// Returns the token on success, or null if unsupported/denied/failed.
export async function enablePush(uid) {
  if (!uid || !pushSupported()) return null;
  try {
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    const { getToken } = await import('firebase/messaging');
    // Use the app's own (Workbox) service worker registration, the background
    // message handler is imported into it via workbox.importScripts.
    const swReg = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return null;

    await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
      platform: 'web',
      userAgent: navigator.userAgent.slice(0, 200),
      timezone: currentTimezone(),
      updatedAt: serverTimestamp(),
    });
    // Keep this device's token ONLY in the per-device fcmTokens subcollection.
    // We deliberately do NOT write the single top-level `fcmToken` field: with
    // the app open on several devices each would overwrite that one field (it
    // would "rotate"), and it would also clobber the iOS app's token. The Cloud
    // Function already reads every token in this subcollection, so all devices
    // still receive pushes. We still keep the user's timezone up to date for the
    // daily reminder.
    await setDoc(doc(db, 'users', uid), { timezone: currentTimezone() }, { merge: true });

    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.error('[push] enablePush failed', err);
    return null;
  }
}

// Remove this device's token (e.g. when the person turns all notifications off
// or logs out) so they stop receiving pushes here.
export async function disablePush(uid) {
  const token = localStorage.getItem(LOCAL_TOKEN_KEY);
  if (uid && token) {
    try { await deleteDoc(doc(db, 'users', uid, 'fcmTokens', token)); } catch { /* ignore */ }
  }
  localStorage.removeItem(LOCAL_TOKEN_KEY);
}

// Show foreground messages (when the app is open) as a notification too, since
// FCM's onBackgroundMessage only fires when the page isn't focused.
export async function listenForegroundMessages() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, (payload) => {
    const d = payload?.data;
    if (d && Notification.permission === 'granted') {
      try { new Notification(d.title || '', { body: d.body, icon: '/assets/icon-192.png' }); }
      catch { /* some browsers only allow SW notifications; ignore */ }
    }
  });
}
