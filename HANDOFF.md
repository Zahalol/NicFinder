# HANDOFF — NicFinder

_Last updated: 2026-11-04. Branch: `claude/hopeful-feynman-mchyuv`._

This file is the single entry point for anyone (human or AI) picking up the
project. Read this, then the root `README.md`, then `docs/README.md`.

## What this is

**NicFinder** — a location-based price-comparison site for ZYN nicotine
pouches (Chicago pilot). Informational only, adults 21+, no sales. Think
"calm GasBuddy for pouches": search a ZIP/address → nearby stores on
list/map → latest reported price per can, multi-can deal math, community
confirm/dispute with a reputation system, and an admin suite built around a
CSV/XLSX import pipeline. Visual tour: `docs/screenshots/`.

## Current state: **complete, verified MVP — ready to deploy on Replit**

Every gate is green as of the last commit:

| Gate | Command | Status |
| --- | --- | --- |
| Unit/integration tests (53) | `npm test` | ✅ |
| Lint / typecheck | `npm run lint` / `npm run typecheck` | ✅ |
| Production build | `npm run build` | ✅ |
| Browser e2e smoke (35 checks) | `npm run e2e` (after build + seed) | ✅ |

**Not built by design:** any outbound calling (ElevenLabs/Twilio). That is
research-only — `docs/ELEVENLABS_CALLING_RESEARCH.md` — and gated on legal
review (TCPA wireless-consent is the headline risk).

## Run it in 5 minutes

```bash
npm install
cp .env.example .env            # set SESSION_SECRET + DATABASE_URL (Postgres)
npx prisma generate
npx prisma migrate deploy
npm run db:seed                 # demo users + Chicago directory + demo prices
npm run dev                     # http://localhost:3000
```

Postgres options are in README "Database setup" (Docker one-liner, or point
at the Replit/Neon DB). Demo logins in `docs/DEMO_GUIDE.md` — admin is
`admin@example.com` / `admin-demo-password` (**local demo only — change
before any shared deployment**).

## Deploying (the owner's plan: Replit)

Follow `docs/REPLIT.md` end to end. Short version: import repo → add
PostgreSQL database → set secrets (`SESSION_SECRET`, `APP_URL`,
`REPLIT_AUTH_ENABLED=true`, later `DEMO_MODE=false`) → enable Replit Auth
(gives Google/GitHub/Apple/email SSO with no credential setup) → deploy
Autoscale (build/run already configured in `.replit`) → add a Scheduled
Deployment running `node scripts/maintenance.mjs` → promote your own
account to ADMIN in the DB.

## Repo map

```
README.md / HANDOFF.md        start here
docs/                         all documentation (index: docs/README.md)
docs/screenshots/             visual tour (committed PNGs)
sample-data/                  fictional CSV + XLSX import samples
prisma/                       schema, migrations (Postgres), seed
src/lib/                      domain logic (framework-free, unit-tested):
  import/                     the import engine — the system's central seam
  prices.ts                   latest-price selection policy
  reputation.ts               community trust engine
  deals.ts / money.ts / geo*  deal math, cents, geocoding (offline ZIPs)
src/app/                      Next.js pages + API routes (/admin, /api)
scripts/                      e2e-smoke.mjs, maintenance.mjs, make-sample-xlsx.mjs
tests/                        vitest suites (run on nicfinder_test DB)
```

## Invariants — do not break these

1. **Honesty of data.** Never attach prices to real stores without a real
   observation; never let ZYN Ultra inherit regular prices; unknown stays
   unknown; demo data stays visibly labeled (`Store.isDemo`, DEMO_MODE
   banner).
2. **Observations are append-only.** Corrections/reversals change `status`
   (SUPERSEDED/INVALIDATED), never delete. Displayed prices are *computed*
   (`src/lib/prices.ts`).
3. **Idempotent imports.** Same file or same row twice must change nothing
   (content + row hashes). Tested — keep those tests green.
4. **Server-side authz on every admin/API route** (`withStaff`/`withAdmin`);
   the UI redirect is not the security boundary.
5. **Age gate is an overlay, not a redirect** — redirects would block
   search-engine indexing of `/zyn-prices/*`, the only viable acquisition
   channel (nicotine ads are banned on Google/Meta).
6. **Postgres transactions abort on any failed statement** — use
   `createMany({ skipDuplicates: true })` for expected unique collisions,
   never `create().catch()` inside a transaction.
7. **No secrets in the repo.** The original research workbook contained
   credentials; it stays gitignored (`*.xlsx` outside `sample-data/`), and
   the owner was advised to rotate anything from shared copies.
8. **`REPLIT_AUTH_ENABLED` only on Replit deployments** — it makes the app
   trust proxy-injected identity headers that are forgeable elsewhere.

## Gotchas learned the hard way

- `src/data/zip-centroids.csv` must keep LF endings (`.gitattributes`
  handles it) — Windows CRLF checkout once broke all ZIP search.
- `npm run e2e` needs the port free; it kills its own process group, but a
  crashed run can orphan `next-server` — `pkill -f next-server`.
- Prisma blocks `migrate reset`/`db push --force-reset` for AI agents; the
  test harness intentionally resets only the `nicfinder_test` schema via
  SQL (name must contain "test").
- An interrupted `npm install` can skip Prisma client generation — hence
  the explicit `npx prisma generate` in setup docs.

## Where to go next (owner-agreed priorities)

See `docs/ROADMAP.md` "Now" section: ① deploy on Replit, ② collect real
prices for the 27 real Chicago stores to measure actual dispersion
(business gate G1 in `docs/BUSINESS_RESEARCH.md`), using
`/admin/coverage` demand to pick expansion ZIPs; calling remains gated on
legal counsel. All past decisions and their reasoning: `docs/DECISIONS.md`.
