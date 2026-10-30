# ALTER 7

Personal single-user MERN coach. THE 7 is the man you are becoming.

Phase 1 is the foundation: auth, habits, opening check, evening confirm, explicit day close, stats, void, and dashboard. Voice (AI) is Phase 2 and is not wired yet.

## Requirements

- Node 20 or newer
- MongoDB Atlas for production; local MongoDB is optional in development

## Run locally

1. Copy `.env.example` to `server/.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. `cd server && npm install && npm run dev`
3. `cd client && npm install && npm run dev`
4. Open `http://localhost:5173` and register the first (only) user.

`client/.env` is optional locally: leave `VITE_API_URL` unset and Vite proxies `/api` to `http://127.0.0.1:5000`.

If a local MongoDB at `MONGODB_URI` is not running, the server starts an embedded MongoDB with data in `server/.data/mongo`. This fallback is development-only and is disabled when `NODE_ENV=production`.

Timezone is **Asia/Dhaka**. Days are ritual days: the opening check files the wake on D, the evening confirm files the last work on D, and **Close the day** closes D that night.

## Tests

```bash
cd server && npm test
```

The suite includes unit tests for scoring/dates, Mongo-backed API tests, and a test of the Vercel serverless entrypoint. The first run may download a MongoDB test binary.

## Deploy Phase 1

Phase 1 should be deployed and used for 3 real days before Phase 2 starts.

### 0. Push to GitHub

Both Vercel projects import from the same repository.

```bash
git add -A
git commit -m "Phase 1: deployable build"
git branch -M main
git remote add origin https://github.com/<you>/alter-7.git
git push -u origin main
```

`.env`, `node_modules/`, `dist/`, and `server/.data/` are gitignored. Only `.env.example` files are committed.

### 1. MongoDB Atlas

- Create a free cluster and a database user.
- Allow access from your API host. If the host uses dynamic IPs, allow `0.0.0.0/0`.
- Use the connection string as `MONGODB_URI`.

### 2. API

The API can run as a separate Vercel project or on a free Node host.

**Option A: Vercel API**

- Import the repo into a new Vercel project.
- Root Directory: `server`
- `server/vercel.json` routes all requests through `server/api/index.js`.
- Environment variables:
  - `MONGODB_URI`
  - `JWT_SECRET` (long random value, not `change-me`)
  - `CLIENT_ORIGIN` (the deployed client URL, no trailing slash)
  - `ALLOW_REGISTRATION=false`
  - `DEFAULT_TIMEZONE=Asia/Dhaka`
- Verify `GET https://<api-project>.vercel.app/api/health` returns `{"ok":true,"db":true}`.

**Option B: Render / Railway / Fly**

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Node version: 20+
- Same environment variables as above. Do not set `PORT`; the host provides it.
- Verify `GET https://<api-host>/api/health` returns `{"ok":true,"db":true}`.

Production notes:

- `NODE_ENV=production` requires a real MongoDB; the embedded fallback will not start.
- `CLIENT_ORIGIN` accepts a comma-separated list if you need preview URLs.
- Production cookies are `Secure; SameSite=None`. Use HTTPS. If Safari blocks third-party cookies, use a custom domain shared by the client and API.
- `ALLOW_REGISTRATION=false` is safe: the first user can still register while no user exists.

### 3. Client on Vercel

- Import the same repo into a second Vercel project.
- Root Directory: `client`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable: `VITE_API_URL=https://<api-host>/api` (include `/api`, no trailing slash).
- `client/vercel.json` rewrites client routes to `index.html`, so deep links such as `/dashboard` work.

Open the deployed app and register the first user. After that, registration is closed.

### 4. First production smoke test

- Register the first user.
- Open the opening check, tick the wake, and **Report in**: the day stays open and the dashboard drops the opening prompt.
- Open the evening confirm, file the evening habits, and **Report in**: the day is still open.
- Press **Close the day** on the evening screen: the day closes, the score and verdict arrive the same night, and streak/XP update.
- Leave a day open and check that it auto-closes at 12:00 noon Asia/Dhaka on the next day.
- Edit a closed day within 3 days; confirm the score and streak recalculate and an older closed day is locked.
- Edit a habit and confirm stats recalculate.
- Delete a day log and confirm stats reset.
- Confirm a report takes under 30 seconds on a phone.

### 5. Phase 1 gate

Use the deployed app for 3 real days before starting Phase 2. During those days, watch for:

- Dhaka date rollover and noon auto-close behavior
- Auth cookie persistence on mobile
- Streak, XP, and rank correctness
- Backfill and delete behavior
- Habit edits not corrupting historical stats

Phase 2 (AI verdict/chat) starts only after this gate. The AI environment variables in `.env.example` are unused in Phase 1.
