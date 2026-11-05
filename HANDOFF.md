# HANDOFF

The entry point for the next person or AI session. It describes the project
**as it is now**; history lives in `DEVLOG.md` and `docs/history/`.
_Last updated: 2026-11-05, after merging the five parallel sessions._

## Current state

- **What it is:** NicFinder, an informational (21+, no sales) price-comparison
  site for nicotine pouches, piloting ZYN in Chicago. Next.js 15 (App Router)
  + Prisma 6 + PostgreSQL. A complete, verified MVP, **not yet deployed**.
- **Repository:** `github.com/Zahalol/NicFinder`. `main` is the only branch
  and it is **protected**: every change goes through a pull request, and the
  `verify` GitHub Actions check (lint, typecheck, vitest, build) must pass.
  No approvals are required (solo owner). CI does not run the e2e test.
- **Quality gates, all green on `main`:** 171 vitest tests (22 files), the
  85-check browser e2e smoke test, lint, typecheck, production build, and
  `prisma migrate deploy` onto an empty database with no schema drift.
- **Data:** real Chicago stores appear as a directory **without prices**;
  synthetic prices only on fictional "Demo" stores (`DEMO_MODE=true`). Real
  price collection has not started.
- **Business direction:** the latest research
  ([`research/99_FOUNDER_DECISION_BRIEF.md`](research/99_FOUNDER_DECISION_BRIEF.md))
  is a conditional GO as a low-cost side project and **NO-GO on automated
  calling for now**: first test the within-Chicago price spread and B2B
  willingness to pay with manual collection.

## What the product does

- **Search:** ZIP or address (Nominatim, cached), "near me", recent-search
  and neighbourhood chips, "Did you mean" for mistyped ZIPs, store-name
  matches, nearest covered area when outside coverage, coverage requests.
  Results: best-price card, reliability tiers (high/medium/low with
  reasons), deal-aware pricing at 1/3/5/10 cans, value-of-trip savings,
  "Priced only" and name filters, honest "Not carried" / "No price yet".
  Desktop shows the list beside a sticky map (pin click highlights the
  card); phones toggle List/Map. Filter choices are remembered per device.
- **Store pages:** per-line prices, "What you'd pay" deal strip, price
  history sparkline, mini-map, hours, tap-to-call, nearby alternatives,
  share, notes, LocalBusiness + breadcrumb structured data (real stores only).
- **Community:** confirm (including one tap from results) or dispute a
  price, flag observations or deals, report multi-can deals; corroboration
  needs distinct accounts on distinct networks; trusted contributors
  publish directly; reputation ledger; watchlist with in-app price alerts
  and resolution notices; account settings.
- **Pages:** `/compare` (two stores), `/zyn-prices` (covered areas) and
  `/zyn-prices/<zip>` (SEO landing pages with price summary, Ultra column,
  FAQ data, share images), `/price-drops`, `/how-it-works` (`/about`
  redirects here), `/offline`, user profiles.
- **Admin:** overview, CSV/XLSX import with preview, commit and reverse,
  store management with hours and CSV export, the `/admin/collect` calling
  worksheet, review queue, coverage demand, analytics, pilot economics,
  settings, audit log. A key-protected import API with signed webhooks
  exists but is off unless `IMPORT_API_KEY` is set (`docs/API.md`).
- **Platform:** nonce CSP and API body-size guard (`src/middleware.ts`),
  pluggable rate limiting (`RATE_LIMIT_BACKEND=db` for multiple instances),
  network-first service worker, dark mode, maintenance job.

## How the code got here

Five Claude sessions worked in parallel on 2026-11-04/05, each on its own
branch, and were merged on 2026-11-05: research (`research/`), keen-planck
(the base: product depth, community trust, dark mode), focused-darwin
(security hardening and CI), and beautiful-keller (UX). Overlapping security
fixes were **combined**; for the four screens two sessions both redesigned,
keen-planck's version was kept and beautiful-keller's unique features were
ported onto it; duplicate features were reduced to one implementation. Every
decision is recorded in [`docs/DECISIONS.md`](docs/DECISIONS.md) ("Merge of
parallel sessions"). The sessions' own logs are in
[`docs/history/`](docs/history/); treat them as history.

## Open items

**Before or at deployment**
- [ ] Deploy to Replit per [`docs/REPLIT.md`](docs/REPLIT.md), with
      `RATE_LIMIT_BACKEND=db` and the maintenance job scheduled.
- [ ] Replace the seeded demo credentials before any shared deployment;
      promote the owner's account to ADMIN; check `/api/health`.
- [ ] Rotate the ElevenLabs/Twilio credentials that were in the old research
      workbook (status unknown).
- [ ] Decide on `npm audit` advisories that need breaking upgrades (Next 16,
      Prisma 7, exceljs). Not done unattended on purpose.

**Product and data**
- [ ] Start real price collection (manual, per `research/05` and `research/99`)
      and turn `DEMO_MODE` off once real prices exist.
- [ ] Email verification and password reset (password *change* exists).
- [ ] Stronger corroboration against fake accounts: email or phone
      verification, or a minimum account age for corroborators.
- [ ] Ideas still open from the sessions: suggest-a-missing-store, watchlist
      deal badges, view transitions, Overpass/OSM store enrichment, more
      brands in the seed (the product toggle is already data-driven).

**Engineering**
- [ ] Add the e2e smoke test to CI (it needs a built app, a seeded database
      and Playwright); today it runs only locally.
- [ ] Streaming XLSX parsing (imports are capped at 50,000 rows × 200 columns
      instead), and the `StoreIdentity` null-source caveat from
      `docs/history/SECURITY_RELIABILITY_LOG.md`.
- [ ] The nearest-covered-area lookup on the no-coverage page scans up to 500
      stores; fine at pilot scale, revisit if coverage grows.
- [ ] `confirmationWeight` in `src/lib/reputation.ts` is tested but not used
      at runtime: wire it in or remove it.
- [ ] Remove the unused `public/icon-192.png` and `public/icon-512.png` (the
      manifest and service worker use `public/icons/`).

## How to run things

Requires Node 20+ (22 tested) and PostgreSQL. Full setup in `README.md`.

```bash
npm install
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
npx prisma generate
npx prisma migrate deploy
npm run db:seed             # product lines, demo users, Chicago directory, demo prices
npm run dev                 # http://localhost:3000, try ZIP 60614
```

```bash
npm run lint && npm run typecheck
npm test                    # needs a database named nicfinder_test (wiped each run)
npm run build && npm run e2e  # browser smoke test on port 3100; needs Playwright
```

Demo accounts and a guided walkthrough: [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md).

## Gotchas

- **`priceCents` is nullable.** Availability-only rows ("not carried", "out
  of stock") have no price. Any query that reads prices must filter
  `priceCents: { not: null }` or go through `selectLatestPrice`.
- **e2e and the screenshot script write to the database.** Point them at a
  throwaway database. Prisma refuses `migrate reset` from an AI agent
  without the owner's explicit consent, so agents should create a **new**
  database and run `migrate deploy` + seed instead of resetting one.
- **Corroboration independence uses a salted IP hash.** Unknown or local
  origins store `null`, which counts as distinct. Don't "fix" that by
  hashing a fallback constant: it would block corroboration behind a proxy.
  Rotating `SESSION_SECRET` changes every hash.
- **Contribution kinds** are `CONFIRM | DISPUTE | FLAG_OBSERVATION |
  FLAG_DEAL | REPORT_DEAL`; moderation code must branch on kind (see
  `src/app/api/admin/moderation/route.ts`).
- **Publishing is concurrency-safe**: `publishDispute` returns
  `"published" | "already-resolved" | "outdated"`; callers must handle all
  three.
- **Comment hide/restore is state-gated** and clears the report ledger; a
  deleted comment can never be restored.
- **`.gitignore` patterns must be anchored**: an unanchored `coverage/` once
  silently dropped `src/app/admin/coverage/` from every commit.
- **A crashed e2e run can leave `next-server` holding port 3100**
  (`pkill -f next-server`). A stale server keeps serving the *old* build.
- **Dark mode uses `dark:` Tailwind classes** keyed to the system
  preference; new UI needs both variants.

## Resume prompt

```
Project: github.com/Zahalol/NicFinder (branch main, protected: PRs + `verify` check).
Read first: HANDOFF.md, CLAUDE.md, README.md.
State: verified Postgres MVP, all gates green, not yet deployed; demo data only.
Next: owner decides on deployment (docs/REPLIT.md) and starts manual price
collection (research/99_FOUNDER_DECISION_BRIEF.md). Work on a new branch from
main and open a PR.
```
