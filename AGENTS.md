# AGENTS.md

Single-user MERN coach ("THE 7"). Two independent npm projects; there is no root package.json or workspace.

## Commands
- API: `cd server && npm run dev` — Express, `PORT` default 5000, `node --watch`.
- Web: `cd client && npm run dev` — Vite on 5173; proxies `/api` to `127.0.0.1:5000`, so the API must run on 5000.
- Setup: copy `.env.example` to `server/.env`; `MONGODB_URI` and `JWT_SECRET` are mandatory. Start the server from `server/` so `dotenv` finds that file. Put `VITE_*` vars in `client/.env` (see `client/.env.example`), not `server/.env`.
- Tests: `cd server && npm test`. One file: `npx vitest run tests/api.test.js`; one test: add `-t "name"`. The suite mixes pure unit tests with Mongo-backed API and serverless-handler tests; the first run downloads a MongoDB binary (~600 MB) to the user cache.
- Client has no test, lint, or typecheck script; `npm run build` is the only client check.

## Scope
- The code is Phase 1 only: auth, habit CRUD, evening/morning reports, day close, stats, void, dashboard.
- Do not add Phase 2+ features (AI/chat, missions, pain log, history, PWA, export) unless asked. The PRD's phase gating is deliberate.
- Phase 1 must be deployed and used for 3 real days before Phase 2 work starts. Use the gate checklist in `README.md`.
- AI is not wired. Verdicts come from `server/src/services/canned.js` and save `modelUsed: 'canned'`. Keep canned as the permanent fallback when AI lands.

## Architecture
- `server/src/index.js` boots; `server/src/app.js` builds the app. `/api/auth` is public; all other `/api` routes run `requireAuth` then `lazyClose`.
- `server/api/index.js` is the Vercel serverless entrypoint (caches the Mongo connection and app across invocations); `server/vercel.json` routes everything to it. It duplicates the production env checks, so keep the two entrypoints in sync.
- No cron. `lazyClose` auto-closes overdue days on every authenticated API request; day D closes at noon on D+1 in the user's timezone (default `Asia/Dhaka`).
- Ritual days are `YYYY-MM-DD` strings in the user's timezone, never JS `Date` values. Use `server/src/lib/dates.js`.
- Scoring is code-only and pure in `server/src/services/stats.js`. `persistUserStats` recomputes all closed days; call it after any day-log or habit mutation. Never compute stats in routes or the client.
- `server/src/services/closeDay.js` is the close pipeline (merge entries -> score -> upsert verdict -> persist stats). Backfill is limited to 3 days. `autoCloseOverdue` closes a batch with `skipStats` and persists stats once, so never recompute inside the loop.
- Registration is open only while no user exists or `ALLOW_REGISTRATION=true`; first registration seeds the four core habits (`services/seed.js`).
- Every query filters by `userId`. Zod schemas in `server/src/schemas.js` are `.strict()`; every route validates body/query/params through that file.
- Throw `httpError(status, CODE, message)`; the client expects errors shaped `{ error: { code, message, fields? } }`.
- Client: React Router + TanStack Query, `.jsx` only. API calls go through `client/src/api/endpoints.js`; catch `err.uiMessage` for microcopy. Use serialized `id` fields, not `_id`.
- Report screens read the selected ritual day from `?date=YYYY-MM-DD` and also expose day deletion; this is the UI path for backfill, so keep the date picker wired to the query key.
- UI follows Quiet Weight: tokens in `client/tailwind.config.js` and `client/src/styles.css`. Grayscale dominant, brass as the only accent, no shadows, no sound, serif only for THE 7.

## Deployment
- Two Vercel projects from one repo: client root `client`, API root `server`. `client/vercel.json` rewrites all routes to `index.html` so deep links work; do not remove it.
- Client env: `VITE_API_URL` must be the full API base including `/api` and no trailing slash (e.g. `https://api.example.com/api`). Leave it empty locally to use the Vite proxy.
- API env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `ALLOW_REGISTRATION=false`, `DEFAULT_TIMEZONE=Asia/Dhaka`. Never deploy with `JWT_SECRET=change-me`.
- `CLIENT_ORIGIN` is a comma-separated allow-list so preview URLs can be added.
- `NODE_ENV=production` requires a real MongoDB. The embedded MongoDB fallback in `server/src/db.js` is dev-only and refuses to start in production; `mongodb-memory-server` is a devDependency, so production installs must not rely on it.
- `/api/health` is DB-aware: `200 {ok:true,db:true}` or `503`. Use it to verify a deploy.
- Production auth cookies are `Secure; SameSite=None`. Both apps must be HTTPS; cross-site cookies can be blocked by Safari, so a shared custom domain is safer.
- Render/Railway/Fly are supported API alternatives (`npm start`, root `server`); Node 20+ is required by `server/package.json` engines.

## Deployment status (2026-10-29)

Phase 1 is deployed to Vercel; the 3-day gate has not started yet.

- Repo: GitHub `main`, both Vercel projects import from it. No secrets are committed.
- API project: Vercel project `alter-7`, Root Directory `server`, URL `https://alter-7.vercel.app`. Env vars set: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `ALLOW_REGISTRATION=false`, `DEFAULT_TIMEZONE=Asia/Dhaka`.
- Database: Atlas free cluster, host `cluster0.oa7g59a.mongodb.net`, database `alter7`, user `alter7`, network access `0.0.0.0/0`. Credentials live in Vercel and local `server/.env` only — never in this file or git.
- Known issue, resolved: `MONGODB_URI` was first pasted with the Atlas placeholder `<cluster-url>`, which produced `querySrv EBADNAME _mongodb._tcp.<cluster-url>` in runtime logs. `/api/health` must return `200 {"ok":true,"db":true}` before continuing.
- Pending: client Vercel project (Root Directory `client`, project name `alter-7-app`, `VITE_API_URL=https://alter-7.vercel.app/api`), then set `CLIENT_ORIGIN=https://alter-7-app.vercel.app` on the API project and redeploy it.
- `CLIENT_ORIGIN` must always be the client origin, never the API's own URL.
- `vercel.app` is on the Public Suffix List, so the two projects are cross-site; production cookies use `SameSite=None`. If Safari drops the session, use custom subdomains of one owned domain or proxy `/api` through the client domain.
- Local `server/.env` still points at `mongodb://127.0.0.1:27017/alter7` with a dev secret. Local and production databases are intentionally separate; do not copy the dev secret to Vercel.
- Next milestone: finish deploy, register the single user, run the smoke test, then the 3-day Phase 1 gate in `README.md`.

## Conventions
- ESM everywhere; relative imports need explicit `.js`/`.jsx` extensions.
- Server tests include real DB integrations through `mongodb-memory-server`, plus pure unit tests. Changes to scoring, dates, close behavior, auth, or deployment entrypoints need Vitest coverage (current tests cover streaks, lost/backfilled days, ranks, month boundaries, Dhaka rollover, noon auto-close, the 3-day backfill lock, route-level CRUD, and the Vercel handler).
- Never call a live AI provider from a test; mock `fetch`.
- `ALTER-7-PRD.md` is the product/copy/design source of truth; if code and PRD conflict, treat the code as current state and the PRD as the spec — ask before changing scope.
