# Gratitude — Web

A responsive web port of the **Gratitude** iOS app, built with **React + Vite**. It keeps the
original's visual identity — the light‑blue accent, serif display type, rounded cards, the
contribution‑style dashboard, and full light/dark theming — and adapts the three‑tab layout to
work from phone to desktop.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build for production / preview the build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project** and import the repo.
3. Vercel auto-detects Vite — no settings to change:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Deploy.

`vite.config.js` uses `base: '/'` (root hosting), and `vercel.json` adds a single SPA
rewrite so any path serves `index.html`. `node_modules` and `dist` are git-ignored;
Vercel builds from source on each push. No environment variables are needed — the app
runs entirely client-side with `localStorage`.

## What's inside

- **Timeline** — write a gratitude, browse posts grouped by year → week, double‑tap (or the
  heart button) to share a sentiment, toggle a post's privacy, or delete it. Filter between
  connections and your own posts.
- **Connections** — search people, and switch between Activity, Friends, and Requests.
- **Me** — profile + guiding principle, the **gratitude dashboard** heatmap (week / month / year),
  a "themes" word cloud computed from your posts, and the full settings set including a working
  **Light / Dark / System** appearance switch.

Responsive by design: a left sidebar appears at ≥ 860px, and a bottom tab bar below that.

## Notes

The original app talks to Firebase for auth and data. This port stands in for that with local
demo data persisted in `localStorage`, so it's fully explorable offline. Sign in with anything on
the auth screen. "Delete account" in settings clears the local demo data.

To wire it to a real backend later, the seams are isolated in:
- `src/context/AppContext.jsx` — all state + actions (swap the local handlers for API/Firebase calls)
- `src/data/seed.js` — the seed data

## Project structure

```
src/
  main.jsx                 app entry
  App.jsx / App.css        shell + responsive navigation
  index.css                design tokens (colors, type, shape) + light/dark themes
  context/AppContext.jsx   state, persistence, theme, and all actions
  data/seed.js             demo data
  utils/dates.js           ISO-week grouping + formatting
  components/              Icon, ui (button/field/avatar/toggle/segmented/sheet),
                           Composer, PostCard, Dashboard
  pages/                   Auth, Timeline, Connections, Account
  assets/                  logo + "Gratitude" wordmark (from the original app)
```
