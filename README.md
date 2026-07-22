# Gratitude (Web)

A responsive React + Vite port of the Gratitude iOS app, connected to the **same Firebase
backend** so web and iOS share accounts, posts, connections and hearts.

Three sections: **Timeline** (your gratitude feed + your friends' public posts, compose,
heart, privacy toggle), **Connections** (search people, requests, activity), and **Me**
(profile, guiding principle, contribution dashboard, themes, appearance/settings).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

The Firebase web config is baked into `src/firebase.js`, so it connects out of the box.
Every value can be overridden with a `VITE_FIREBASE_*` environment variable — see `.env.example`.

## Firebase setup (one-time, required)

The web app is a **separate client** on the same Firebase project as iOS. The data is shared,
but you must enable web access:

1. **Web app registered** — done (its config is in `src/firebase.js`). If you ever need it
   again: Firebase console → Project settings → Your apps → Web.
2. **Enable Email/Password sign-in** — Authentication → Sign-in method → enable
   *Email/Password*. (This is what the iOS app uses too.)
3. **Add your web domains to Authorized domains** — Authentication → Settings →
   Authorized domains. Add your Vercel URLs (e.g. `your-app.vercel.app` and any custom
   domain). **This is the #1 thing that silently blocks sign-in on a new host.**
   `localhost` is already allowed for local dev.
4. **Publish security rules** — the default locked rules block everything. Publish the
   included rules so the web client can read/write the shared data:
   - Firestore Database → Rules → paste `firestore.rules` → Publish
   - Storage → Rules → paste `storage.rules` → Publish

   (These match the exact collection layout the iOS app already uses — see below — so they
   won't change how iOS behaves.)
5. **Composite index (only if prompted)** — the timeline uses single-field queries that
   Firestore indexes automatically. If the console ever logs a "create index" link for a
   query, click it once; no manual setup is needed up front.
6. **Storage CORS (required for "Share as image")** — the share card is drawn on an HTML
   canvas, which needs to load the poster's profile photo with `crossOrigin="anonymous"`.
   Firebase Storage does **not** allow cross-origin canvas reads by default — without this
   step the share card silently falls back to an initial-letter avatar instead of the real
   photo. Configure it once with the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
   (`gsutil`, included with it):

   ```bash
   # Edit cors.json first — replace YOUR-CUSTOM-DOMAIN.com with your real domain
   # (or remove that line if you don't have one yet), then:
   gcloud auth login
   gsutil cors set cors.json gs://milestonedev-gratitude.firebasestorage.app
   ```

   Verify it took effect with `gsutil cors get gs://milestonedev-gratitude.firebasestorage.app`.
   Everything else in the app (viewing photos, uploading them) works fine without this —
   it's only the canvas-based share card that needs it.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → import the repo**. Framework preset auto-detects **Vite**
   (build `npm run build`, output `dist`). `vercel.json` already handles SPA routing.
3. **No environment variables are required** — the config is baked in. (You may add
   `VITE_FIREBASE_*` vars to target a different project.)
4. Deploy, then copy the deployment domain into Firebase **Authorized domains** (step 3 above).

## Data model (shared with iOS)

- `users/{uid}` — `email`, `screenName` (lowercase), `createdAt`, `motto`, `challenge`,
  `mottoVisibility`, `userType`, `photoURL`, `connectionsEnabled`, notify flags,
  `defaultTimeline`, `defaultPostVisibility`.
- `users/{uid}/posts/{postId}` — `gratitude`, `date` (Timestamp), `isPublic`, `heartedBy[]`, `photoURL?`.
- `users/{uid}/notifications/{id}` — `{ type:'heart', fromUserId, postId, timestamp }`.
- `friends/{uid}/userFriends/{friendUid}` — accepted friends.
- `friendRequests/{uid}/{sent|received}/{otherUid}` — `{ status:'pending' }`.
- Storage: `profilePictures/{uid}.jpg`, `posts/{uid}/{postId}.jpg`.

Login accepts a username or an email; a username is resolved to its email via the `users`
collection, then signed in — identical to the iOS behavior.

## Service worker (image caching + auto-update)

The app registers a service worker (via `vite-plugin-pwa`) that:
- Caches profile photos and post photos from Firebase Storage (stale-while-revalidate — instant
  from cache, refetches quietly in the background) and Google Fonts (cache-first, they're immutable).
- Auto-updates: when a new deploy goes out, the new service worker takes over immediately and the
  open tab reloads itself to pick it up — no more closing and reopening the app to see changes.
  It also re-checks for updates whenever the tab regains focus and every 5 minutes while open.

Nothing to configure — this works out of the box on Vercel. Locally, service workers only run over
`https://` or `localhost`, so `npm run dev` behaves the same as before.

## Push notifications (new posts, sentiments, daily reminder)

The app can notify people about a friend's new post, a sentiment on their post, a
new connection request, and a daily reminder — even when the app is closed. This
uses Firebase Cloud Messaging (FCM) on the client plus Cloud Functions on the server.

**Platform reality check:** on **iOS** web push only works if the app is **added to
the Home Screen** (not in a Safari tab) and the device is on **iOS 16.4+**. On
Android/desktop Chrome & Edge it works installed or in the browser. The daily
reminder is sent server-side (a scheduled Cloud Function), because browsers can't
reliably wake themselves on a schedule.

### One-time setup

1. **Blaze plan** — Cloud Functions (and scheduled functions) require the
   pay-as-you-go plan. Firebase console → Upgrade. (Usage at this scale is typically free-tier.)
2. **Web Push certificate (VAPID key)** — console → Project settings → Cloud
   Messaging → *Web Push certificates* → Generate key pair. Copy the key and expose
   it to the web build as `VITE_FIREBASE_VAPID_KEY` (Vercel env var, or your `.env`).
   Without it, the app can't register for push.
3. **Match the FCM service-worker config** — `public/fcm-sw.js` has the Firebase
   config hard-coded (it can't read env vars). If you ever change projects, update
   the config object there to match `src/firebase.js`.
4. **Install the Firebase CLI** (`npm i -g firebase-tools`), then `firebase login`
   and `firebase use milestonedev-gratitude` (or `firebase use --add`).

### Deploy

```bash
# from the project root (firebase.json points at ./functions and the rules)
cd functions && npm install && cd ..

firebase deploy --only firestore:rules,storage      # publishes the updated rules (fcmTokens)
firebase deploy --only functions                        # deploys the 4 push functions
```

The functions deployed here add only `dailyReminder` (runs every 15 min, sends to
each user whose local time matches their `reminderTime`). Your project's existing
functions — `notifyOnPostHeart`, `notifyFriendsOnNewPost`, `notifyOnConnectionRequest`
— keep handling hearts, posts, and requests unchanged, and now reach web devices too
because the web client writes its token to the same `users/{uid}.fcmToken` field they
read. **When `firebase deploy --only functions` warns those functions "do not exist in
local source", answer NO** so they are preserved.

### How the client behaves

- Turning on any notification toggle in Settings prompts for permission and
  registers this device's push token.
- Returning users with permission already granted are re-registered automatically.
- Logging out removes this device's token.
- The person's timezone is stored on their user doc so the reminder fires at the
  right local time.

## Tech

React 18, Vite 5, Firebase JS SDK v10 (Auth, Firestore, Storage), plain CSS with a
light/dark theme. Design tokens mirror the iOS app (accent, Fraunces + Inter type, iOS-style
grays and radii).
