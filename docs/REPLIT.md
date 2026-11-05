# Deploying NicFinder on Replit

Step-by-step guide from this repo to a live site. (Replit's UI moves around;
when a menu name differs, search Replit's Tools pane for the feature name.)

## 1. Import the repo

1. Replit → **Create Repl → Import from GitHub** → `Zahalol/NicFinder`.
2. The bundled `.replit` file configures Node 22, the dev command, and the
   deployment build/run commands automatically.

## 2. Database (required)

Replit's built-in database is **PostgreSQL (Neon)** — exactly what the app
expects.

1. Tools → **Database** (PostgreSQL) → create.
2. Replit automatically exposes `DATABASE_URL` as a secret/env var in the
   workspace and in deployments. No code changes needed.
3. In the Replit **Shell**, initialize it:
   ```bash
   npx prisma migrate deploy
   npm run db:seed        # optional: demo stores/users + Chicago directory
   ```
   The seed is additive and labeled demo data; skip it for a clean production
   start (you still need product lines — run it once, then delete demo stores
   from /admin/stores, or set `DEMO_MODE=false` and keep them hidden by their
   badges until you remove them).
4. Tip: you can also point your local `.env` `DATABASE_URL` at this same
   connection string so your Windows machine and Replit share one database
   (no local Postgres install needed).

## 3. Secrets (Tools → Secrets)

| Secret | Value |
| --- | --- |
| `SESSION_SECRET` | output of `openssl rand -hex 32` (any long random string) |
| `APP_URL` | your deployment URL, e.g. `https://nicfinder.yourname.repl.co` or custom domain |
| `REPLIT_AUTH_ENABLED` | `true` — **only** here, never in local `.env` (see Auth below) |
| `DEMO_MODE` | `false` once real price data is loaded |
| `NOMINATIM_USER_AGENT` | a short app identifier, e.g. `nicfinder-prod` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional — only if you also want direct Google OAuth alongside Replit Auth |

`DATABASE_URL` is managed by the Replit database integration.

## 4. Sign-in with SSO (Replit Auth)

The app has a built-in **Replit Auth** provider (`/api/auth/replit`):

1. Enable **Replit Auth** on the deployment (Deployment settings → Auth, or
   the Auth pane). Choose which providers to allow — Google, GitHub, Apple,
   email — Replit manages all credentials; you configure nothing at Google.
2. Set the `REPLIT_AUTH_ENABLED=true` secret. The login/signup pages then
   show **“Continue with Replit”**; the route reads the identity headers
   Replit's proxy injects (`X-Replit-User-Id`, `X-Replit-User-Name`) and
   creates a normal NicFinder account/session (stored in `User.replitId`).
3. Security note: those headers are only trustworthy behind Replit's proxy.
   That's why the flag must never be set elsewhere — with it off, the route
   refuses and the button is hidden. Email/password keeps working in
   parallel (useful for the seeded admin).
4. Admin access: sign in once via Replit, then promote your account in the
   database (Shell):
   ```bash
   npx prisma studio   # or: psql $DATABASE_URL
   # set your user row's role to ADMIN
   ```

## 5. Deploy

1. **Deploy** → **Autoscale** (the `.replit` file already sets build & run:
   `npm ci && prisma generate && prisma migrate deploy && npm run build`,
   then `npm start`). Migrations run on every deploy — safe and idempotent.
2. Health check path: `/api/health` (returns 503 if the DB is unreachable).
3. Attach a custom domain in deployment settings when ready.

Autoscale runs **multiple instances**, so set the secret
`RATE_LIMIT_BACKEND=db` there: login/signup throttling then uses a shared
Postgres sliding window (`RateLimitEvent`, pruned by the maintenance job)
instead of per-process memory. Locally the default (`memory`) is fine.

Autoscale notes: the filesystem is ephemeral (fine — all state is in
Postgres) and the in-memory login rate limiter is per-instance (documented
in ARCHITECTURE.md; acceptable at this scale).

## 6. Scheduled Deployments (maintenance job)

Create a **Scheduled Deployment** to run periodic maintenance:

- Command: `node scripts/maintenance.mjs`
- Schedule: hourly or daily.
- It expires past-due quantity deals and logs freshness/queue/coverage
  counts (JSON) for monitoring. It never deletes data.

This is also the natural home for a future import-ingestion job (pull CSV
files from Object Storage and POST them to the importer — see
IMPORT_CONTRACT.md "Future automated handoff").

## 7. Other Replit features worth using

- **Object Storage**: future home for receipt-photo evidence uploads and
  for the calling system's CSV drop folder (the importer stays unchanged;
  a scheduled job ingests new files).
- **Replit Agent / AI**: useful for small UI iterations directly in the
  workspace; the repo's docs (ARCHITECTURE.md, IMPORT_CONTRACT.md,
  COMMUNITY_REPUTATION.md) give it the context it needs. Keep changes on
  branches and keep `npm test` green.
- **Replit Database pane / Prisma Studio** (`npx prisma studio`) for quick
  data inspection and the one-time admin-role promotion.
- **Always-on vs Autoscale**: Autoscale is right for this app; if you later
  add websockets or long-running background work, revisit with a Reserved
  VM.

## 8. Post-deploy checklist

- [ ] `/api/health` returns `{ ok: true }`
- [ ] Age gate overlay appears on first visit; content loads behind it
- [ ] Search `60614` returns stores; map tiles load
- [ ] “Continue with Replit” signs you in; promote your account to ADMIN
- [ ] Admin → Imports: upload `sample-data/sample-import.csv`, preview, commit
- [ ] Set `DEMO_MODE=false` and remove/retire demo stores once real data lands
- [ ] Scheduled maintenance deployment runs and logs JSON
- [ ] `robots.txt` and `/sitemap.xml` resolve with your APP_URL
