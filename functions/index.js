// Cloud Functions (2nd gen) for Gratitude.
//
// NOTE: This project already has functions that push on hearts, friends' posts,
// and connection requests (notifyOnPostHeart / notifyFriendsOnNewPost /
// notifyOnConnectionRequest). Those keep working unchanged and already deliver
// to web devices too, because the web client writes its token to the same
// `users/{uid}.fcmToken` field they read.
//
// This file therefore only adds the ONE thing the project was missing: a
// server-scheduled daily reminder (browsers can't reliably wake themselves).
//
// Deploy (Blaze plan required):  firebase deploy --only functions
// When prompted that the notify* functions "do not exist in local source",
// answer NO so they are kept.

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

// Daily reminder. Runs every 15 minutes; sends to each user whose local time
// (per their stored timezone) matches their reminderTime, rounded to the
// nearest quarter hour. Requires `dailyReminder: true` on the user doc.
export const dailyReminder = onSchedule('every 15 minutes', async () => {
  const users = await db.collection('users').where('dailyReminder', '==', true).get();
  const now = new Date();

  await Promise.all(users.docs.map(async (u) => {
    const token = u.get('fcmToken');
    if (!token) return;

    const tz = u.get('timezone') || 'UTC';
    const reminder = u.get('reminderTime') || '08:00';
    let hhmm;
    try {
      hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(now);
    } catch {
      hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(now);
    }
    const [nh, nm] = hhmm.split(':').map(Number);
    const [rh, rm] = reminder.split(':').map(Number);
    if (nh !== rh || Math.floor(nm / 15) !== Math.floor(rm / 15)) return;

    try {
      await getMessaging().send({
        token,
        notification: {
          title: 'Your daily gratitude',
          body: 'Take a moment — what are you grateful for today?',
        },
        data: { url: '/' },
        webpush: { fcmOptions: { link: '/' }, notification: { icon: '/assets/icon-192.png' } },
      });
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        await db.doc(`users/${u.id}`).update({ fcmToken: null }).catch(() => {});
        logger.info(`Cleared stale fcmToken for ${u.id}`);
      }
    }
  }));
});
