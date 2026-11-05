# Progress

Milestone ledger, newest first. For the current state and open items read
[`HANDOFF.md`](../HANDOFF.md); for dated detail read [`DEVLOG.md`](../DEVLOG.md).
Test counts in older milestones are as of that milestone.

## Current status (2026-11-05)

MVP complete, verified, not yet deployed. `main` is the only branch and is
protected (PRs + the `verify` CI check). Gates green on `main`: 171 vitest
tests, the 85-check e2e smoke test, lint, typecheck, production build, and
migrations applied to an empty database with no schema drift.

### How to verify

```bash
npm install && npx prisma generate
npx prisma migrate deploy && npm run db:seed   # migrated + seeded DATABASE_URL
npm run lint && npm run typecheck
npm test                                       # nicfinder_test DB, wiped each run
npm run build && npm run e2e                   # needs Playwright; port 3100
```

## Milestone 5: parallel sessions merged (2026-11-05)

Five sessions that ran in parallel were merged into `main` (PR #1), then the
docs were reconciled. The details are in `HANDOFF.md` ("How the code got
here") and `docs/DECISIONS.md` ("Merge of parallel sessions").

- [x] Research due diligence added in `research/` (legal, economics, launch
      plan, city ranking, financial scenarios, decision brief).
- [x] Security hardening combined with the base branch: atomic publish
      claims, bulk import pipeline, API body-size guard alongside the nonce
      CSP, OAuth linking rules, state-gated moderation, CI workflow.
- [x] UX features ported onto the kept screens: did-you-mean ZIPs, nearest
      covered area, quick chips, store-name matches, one-tap confirm,
      desktop list + map split view, remembered filters, "What you'd pay"
      strip, mini-map, breadcrumbs, ZIP-page summaries and Ultra column,
      price drops, covered-areas index, share images, offline page.
- [x] Duplicate implementations removed; `/about` redirects to `/how-it-works`.
- [x] Screenshot tour retaken from `main` with a reusable capture script.

## Milestone 4: autonomous improvement sessions (2026-11-04 → 05)

Each session's own log is in [`history/`](history/).

- [x] **Product depth and trust** (keen-planck, 73 cycles): availability-only
      observations, observation and deal flagging, community deal reports,
      in-app price alerts and resolution notices, reliability tiers,
      price-history sparklines, value-of-trip math, two-store compare,
      nearest-500 search fix found by a 10k-store benchmark, dark mode,
      store hours, the `/admin/collect` worksheet, pilot economics, CSV
      export, audit-log viewer, import API with signed webhooks, pluggable
      rate limiting.
- [x] **Security and reliability** (focused-darwin, about 35 findings in 12
      waves): OAuth takeover paths closed, concurrency-safe publishing,
      import hardening and fuzzing, request-size guard, CI.
- [x] **UX experiments** (beautiful-keller, 43 cycles), ported as listed
      above.

## Milestone 3: enhancement pass

- [x] PostgreSQL (Replit-ready), with a dedicated `nicfinder_test` database
      for tests.
- [x] Replit prep: `.replit`, `/api/health`, Replit Auth provider,
      `scripts/maintenance.mjs`, `docs/REPLIT.md`.
- [x] Coverage requests, best-price card, watchlist, ZIP SEO pages, sitemap,
      robots, age gate as an overlay (keeps pages crawlable), admin
      analytics, loading/error/404 pages.
- [x] At the time: 53 vitest tests, 35-check e2e.

## Milestone 2: MVP

- [x] Next.js 15, TypeScript strict, Tailwind 4, Prisma 6 (SQLite at the
      time; now PostgreSQL).
- [x] Schema, migrations and an idempotent seed: 27 sanitized real Chicago
      stores without prices, fictional demo stores with synthetic prices,
      demo users.
- [x] Core libraries: money in cents, deal math, latest-price policy,
      geo search, offline ZIP geocoder (41k ZIPs) plus cached Nominatim,
      matching helpers, settings, audit, rate limits.
- [x] Import pipeline: CSV/XLSX, header aliases and remapping, validation
      with issue codes, cautious store matching, dedupe, preview → commit →
      reverse, error-report CSV.
- [x] Auth (scrypt, hashed session tokens, env-gated Google OAuth), public
      UX, community confirm/dispute with corroboration and reputation,
      admin suite.
- [x] At the time: 51 vitest tests, 20-check e2e.

## Milestone 1: research

- [x] `docs/BUSINESS_RESEARCH.md` and `docs/ELEVENLABS_CALLING_RESEARCH.md`
      (first pass, partly superseded by `research/`).
