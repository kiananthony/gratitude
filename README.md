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

## Tech

React 18, Vite 5, Firebase JS SDK v10 (Auth, Firestore, Storage), plain CSS with a
light/dark theme. Design tokens mirror the iOS app (accent, Fraunces + Inter type, iOS-style
grays and radii).
