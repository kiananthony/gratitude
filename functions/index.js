// Cloud Functions (2nd gen) for Gratitude push notifications.
//
// This is the COMPLETE set and is meant to REPLACE any older push functions in
// the project (e.g. notifyOnPostHeart / notifyFriendsOnNewPost /
// notifyOnConnectionRequest). When `firebase deploy --only functions` asks about
// functions that "do not exist in local source", answer YES to delete the old
// ones — these supersede them.
//
// Covers: a friend's new public post, a sentiment (heart) on your post, a new
// connection request, and a daily reminder. Each respects the matching per-user
// notification toggle and delivers to every device (the iOS `fcmToken` field and
// all web tokens in users/{uid}/fcmTokens).
//
// Deploy (Blaze plan required):  firebase deploy --only functions

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

// ---- helpers ----------------------------------------------------------------

// Collect every push token for a user: the single `fcmToken` field (iOS/legacy)
// plus every doc id in the web `fcmTokens` subcollection.
async function tokensFor(uid) {
  const tokens = new Set();
  const userSnap = await db.doc(`users/${uid}`).get();
  const legacy = userSnap.get('fcmToken');
  if (legacy) tokens.add(legacy);
  try {
    const sub = await db.collection(`users/${uid}/fcmTokens`).get();
    sub.forEach((d) => tokens.add(d.id));
  } catch { /* subcollection may not exist yet */ }
  return { user: userSnap, tokens: [...tokens] };
}

function truncate(s, n = 80) { return s && s.length > n ? s.slice(0, n - 1) + '…' : (s || ''); }

// Send to a user, respecting a settings flag, and prune tokens FCM rejects.
async function pushToUser(uid, { title, body, url = '/' }, settingKey) {
  const { user, tokens } = await tokensFor(uid);
  if (!user.exists) return;
  if (settingKey && user.get(settingKey) === false) return; // respect opt-out
  if (tokens.length === 0) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url },
    webpush: { fcmOptions: { link: url }, notification: { icon: '/assets/icon-192.png' } },
  });

  const stale = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) stale.push(tokens[i]);
    }
  });
  await Promise.all(stale.map(async (tk) => {
    await db.doc(`users/${uid}/fcmTokens/${tk}`).delete().catch(() => {});
    if (user.get('fcmToken') === tk) await db.doc(`users/${uid}`).update({ fcmToken: null }).catch(() => {});
  }));
  if (stale.length) logger.info(`Pruned ${stale.length} stale token(s) for ${uid}`);
}

// ---- triggers ---------------------------------------------------------------

// Sentiment (heart) on your post. The app writes a notification doc under the
// post owner on heart; we push off that write.
export const onSentiment = onDocumentCreated('users/{ownerId}/notifications/{notifId}', async (event) => {
  const data = event.data?.data();
  if (!data || data.type !== 'heart') return;
  const { ownerId } = event.params;
  const fromId = data.fromUserId;
  let fromName = 'Someone';
  try { fromName = (await db.doc(`users/${fromId}`).get()).get('screenName') || fromName; } catch {}
  let postText = '';
  try { postText = (await db.doc(`users/${ownerId}/posts/${data.postId}`).get()).get('gratitude') || ''; } catch {}
  await pushToUser(ownerId, {
    title: `@${fromName} shared a sentiment`,
    body: postText ? `“${truncate(postText)}”` : 'on your gratitude post',
    url: '/',
  }, 'notifyPostReactions');
});

// A friend's new public post → notify the author's friends.
export const onFriendPost = onDocumentCreated('users/{authorId}/posts/{postId}', async (event) => {
  const post = event.data?.data();
  if (!post || post.isPublic !== true) return;
  const { authorId } = event.params;
  let authorName = 'A friend';
  try { authorName = (await db.doc(`users/${authorId}`).get()).get('screenName') || authorName; } catch {}
  const friends = await db.collection(`friends/${authorId}/userFriends`).get();
  await Promise.all(friends.docs.map((f) => pushToUser(f.id, {
    title: `@${authorName} shared a new gratitude`,
    body: truncate(post.gratitude),
    url: '/',
  }, 'notifyFriendsPosts')));
});

// New connection request → notify the recipient.
export const onConnectionRequest = onDocumentCreated('friendRequests/{uid}/received/{fromUid}', async (event) => {
  const { uid, fromUid } = event.params;
  let fromName = 'Someone';
  try { fromName = (await db.doc(`users/${fromUid}`).get()).get('screenName') || fromName; } catch {}
  await pushToUser(uid, {
    title: 'New connection request',
    body: `@${fromName} wants to connect`,
    url: '/',
  }, 'notifyConnectionRequests');
});

// Daily reminder. Runs every 15 minutes; sends to each user whose local time
// (per their stored timezone) matches their reminderTime, rounded to the
// nearest quarter hour. Requires `dailyReminder: true` on the user doc.
export const dailyReminder = onSchedule('every 15 minutes', async () => {
  const users = await db.collection('users').where('dailyReminder', '==', true).get();
  const now = new Date();
  await Promise.all(users.docs.map(async (u) => {
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
    await pushToUser(u.id, {
      title: 'Your daily gratitude',
      body: 'Take a moment — what are you grateful for today?',
      url: '/',
    }, 'dailyReminder');
  }));
});
