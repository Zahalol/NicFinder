# NicFinder

Location-based price comparison for nicotine pouches (ZYN pilot, Chicago).
An informational service for adults 21+ — **no sales, checkout, delivery, or
nicotine marketing**. Browse free; sign in to confirm or correct prices.

The site works like a calmer GasBuddy for pouches: search any US address or
ZIP (with "near me", recent searches and ZIP-typo suggestions), see nearby
stores as a list beside a live map, compare single-can prices and multi-can
deal pricing at your quantity, and see exactly how fresh and trustworthy
every number is: each price carries a **reliability tier** with its reasons,
and stores reported as not carrying a product say so instead of showing an
invented price. Members confirm a price in one tap, save stores to a
watchlist with in-app price alerts, and compare two stores side by side.
There are SEO landing pages per ZIP, a recent price-drops page, dark mode,
and an installable PWA with an offline page (cached prices are never shown
as live). Prices arrive by **file import** (CSV/XLSX from a future calling
system — see `docs/IMPORT_CONTRACT.md`, or programmatically via the disabled-
by-default API in `docs/API.md`), by **community reports**, and by
**manual admin entry**. There is deliberately **no calling code** in this
application (`docs/ELEVENLABS_CALLING_RESEARCH.md` covers that future workstream).

<p align="center">
  <img src="docs/screenshots/03-search-desktop.png" alt="Search results: list beside the live map, best-price card" width="80%">
</p>

**📸 Full visual tour: [docs/screenshots/](docs/screenshots/README.md)**:
search, map, deals, store pages, community flows, dark mode, and the whole
admin suite.

## Quick start

Requires Node 20+ (tested on 22) and a PostgreSQL database. No paid
services or API keys needed.

**Database setup (pick one):**

- **Docker (easiest locally):**
  ```bash
  docker run --name nicfinder-pg -e POSTGRES_USER=nicfinder -e POSTGRES_PASSWORD=nicfinder_dev -e POSTGRES_DB=nicfinder -p 5432:5432 -d postgres:16
  ```
- **Shared cloud DB:** point `DATABASE_URL` at your Replit/Neon database
  (see `docs/REPLIT.md`) — no local install at all.
- **Native Postgres:** create a `nicfinder` database and matching user.

The test suite uses a **separate** database whose name must contain `test`
(it is wiped on every run): create `nicfinder_test` owned by the same user,
for example `docker exec nicfinder-pg createdb -U nicfinder nicfinder_test`.
Override its URL with `TEST_DATABASE_URL` if yours differs.

**App setup:**

```bash
npm install
cp .env.example .env          # set SESSION_SECRET and DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run db:seed               # product lines, demo users, Chicago store directory
npm run dev                   # http://localhost:3000
```

Then search **60614** (the Chicago pilot area). Demo accounts are listed in
`docs/DEMO_GUIDE.md` (admin: `admin@example.com` / `admin-demo-password`).
**Deploying on Replit:** see `docs/REPLIT.md` (database, secrets, Replit Auth
SSO, Autoscale deployment, scheduled maintenance).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | 171 unit/integration tests on the `nicfinder_test` database |
| `npm run build && npm run e2e` | 85-check browser smoke test against a production build (port 3100; needs Playwright, a migrated + seeded `DATABASE_URL`) |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:seed` | Idempotent seed |
| `node scripts/maintenance.mjs` | Periodic cleanup job (expire deals and stale proposals, prune ephemera, reconcile reputation) |
| `node scripts/capture-screenshots.mjs` | Retake every image in `docs/screenshots/` (see its header) |
| `node scripts/make-sample-xlsx.mjs` | Regenerate the XLSX import sample |

Playwright is not a package dependency: it is preinstalled in Claude cloud
containers; elsewhere run `npm i -D playwright` before `npm run e2e`.

## Contributing workflow

`main` is protected: every change goes through a pull request, and the
**`verify`** GitHub Actions check (lint, typecheck, vitest, build against a
Postgres service) must pass before merging. CI does not run the e2e smoke
test, so run `npm run e2e` locally for UI changes. Running several Claude
sessions at once? Read [`docs/PARALLEL_SESSIONS.md`](docs/PARALLEL_SESSIONS.md)
first.

## What's honest here (by design)

- Real Chicago stores from the exploratory research are listed as a
  **directory without prices** — the old spreadsheet is not evidence of
  current prices and is never shown as such.
- Synthetic prices appear only on clearly fictional "Demo …" stores, with a
  visible **demo data** badge and a site-wide banner (`DEMO_MODE` in `.env`).
- Unknown prices show as unknown. ZYN Ultra never inherits regular ZYN
  prices. Stale prices say they're stale. Outside covered areas you get a
  no-coverage message, never an invented result.

## Documentation map

| File | Contents |
| --- | --- |
| `HANDOFF.md` | **Start here.** Current state, open items, gotchas, how to resume |
| `CLAUDE.md` | Working rules for AI coding sessions (read automatically by Claude Code) |
| `DEVLOG.md` | Dated log of finished work, decisions, and lessons |
| `docs/README.md` | Index of everything in `docs/` |
| `docs/PARALLEL_SESSIONS.md` | How to run several sessions at once without conflicts |
| `docs/REPLIT.md` | Replit deployment guide (DB, SSO, Autoscale, cron) |
| `docs/API.md` | Automated import API (bearer key, webhooks — disabled by default) |
| `docs/PRODUCT_REQUIREMENTS.md` | Scope, user flows, edge cases |
| `docs/ARCHITECTURE.md` | Data model, latest-price policy, security, Postgres path |
| `docs/IMPORT_CONTRACT.md` | CSV/XLSX schema, aliases, validation, idempotency |
| `docs/COMMUNITY_REPUTATION.md` | Trust scoring, publication rules, abuse defenses |
| `research/` | **Latest business due diligence** (legal, economics, launch plan, decision brief); start at `research/99_FOUNDER_DECISION_BRIEF.md` |
| `docs/ELEVENLABS_CALLING_RESEARCH.md` | Calling system research (no code); partly superseded by `research/` |
| `docs/BUSINESS_RESEARCH.md` | First-pass market research; partly superseded by `research/` |
| `docs/DECISIONS.md` | Assumptions and why |
| `docs/PROGRESS.md` | Build status, how to resume |
| `docs/DEMO_GUIDE.md` | Demo script with accounts |
| `docs/ROADMAP.md` | Post-MVP priorities |
| `docs/screenshots/` | Visual tour of every screen |
| `docs/history/` | Per-session logs from the parallel sessions (historical) |

## Security & privacy notes

- Passwords: scrypt; sessions: random tokens stored hashed, httpOnly cookies.
- Google OAuth activates only when `GOOGLE_CLIENT_ID/SECRET` are set
  (`.env.example` documents the redirect URI). Without them the UI says so.
  It never auto-links into an existing password account.
- `src/middleware.ts` sets a nonce-based Content-Security-Policy on pages in
  production and rejects oversized API request bodies with 413 (64 KB for
  JSON; 8 MB for the two import upload endpoints).
- Rate limits on auth and contributions; set `RATE_LIMIT_BACKEND=db` when
  running more than one server instance so limits are shared.
- Admin APIs check roles server-side on every route; the e2e suite verifies
  guests get 401/redirects.
- Never commit `.env`, database files, or the original research workbook
  (it contained credentials; `.gitignore` blocks `*.xlsx` outside
  `sample-data/`). Rotate any credentials that were in shared copies.

## Attribution

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors. ZIP centroids from [GeoNames](https://www.geonames.org/)
(CC BY 4.0). Street-address geocoding via the public Nominatim API
(throttled to 1 req/s and cached; disable with `NOMINATIM_ENABLED=false`).
