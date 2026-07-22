// Firebase initialization for the Gratitude web client.
//
// The config below is baked in so the app works as soon as it's deployed, but every
// value can be overridden with a VITE_FIREBASE_* environment variable (e.g. on Vercel).
// Firebase web config values are identifiers, not secrets — security is enforced by your
// Firestore/Storage rules and the Authentication "Authorized domains" list, not by hiding
// these keys (they ship in the client bundle regardless).

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY            || 'AIzaSyAIQM3lhJDK9Ksy9Jk4i3P4Sc-xoWgOL4M',
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN        || 'milestonedev-gratitude.firebaseapp.com',
  projectId:         env.VITE_FIREBASE_PROJECT_ID         || 'milestonedev-gratitude',
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET     || 'milestonedev-gratitude.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID|| '44719069967',
  appId:             env.VITE_FIREBASE_APP_ID             || '1:44719069967:web:d0da63764c2de486773c7a',
  measurementId:     env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-QGV230E85Z',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is optional and only loads in supported browser environments.
export async function initAnalytics() {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) return getAnalytics(app);
  } catch { /* analytics unavailable — ignore */ }
  return null;
}
