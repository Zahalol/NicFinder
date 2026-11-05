# CLAUDE.md

Working rules for AI coding sessions on NicFinder. Read `HANDOFF.md` for the
current state and open items; this file covers how to work.

## Branches and pull requests

- `main` is protected. Never push to it. Work on your own branch from the
  latest `main` and open a pull request; the `verify` check (lint,
  typecheck, vitest, build) must pass before the owner merges.
- One session, one area. If other sessions may be running, follow
  [`docs/PARALLEL_SESSIONS.md`](docs/PARALLEL_SESSIONS.md): stay inside your
  assigned files and don't edit the shared docs listed there.
- Keep PRs focused. Unrelated fixes you notice go in a separate PR or the
  open-items list in `HANDOFF.md`.

## Local setup in a Claude cloud container

Postgres is installed but not running, and it stops when the container
idles. Start it and create the role and databases once per container:

```bash
service postgresql start
su postgres -c "psql -c \"CREATE USER nicfinder WITH PASSWORD 'nicfinder_dev' CREATEDB;\""
su postgres -c "createdb -O nicfinder nicfinder"
su postgres -c "createdb -O nicfinder nicfinder_test"
npm ci && npx prisma generate
```

`DATABASE_URL=postgresql://nicfinder:nicfinder_dev@localhost:5432/nicfinder`.
Tests use `nicfinder_test` by default (`vitest.config.ts`). Playwright and
Chromium are preinstalled for `npm run e2e` and the screenshot script.

**Never run `prisma migrate reset` or drop a database** without the owner's
explicit go-ahead (Prisma blocks AI-initiated resets anyway). When you need a
clean database for e2e or screenshots, create a new one with a fresh name,
then `npx prisma migrate deploy && npm run db:seed`.

## Before you open a PR

```bash
npm run lint && npm run typecheck
npm test
npm run build && npm run e2e      # for any UI or API change; CI does not run e2e
```

- New user-visible features get an e2e check in `scripts/e2e-smoke.mjs`;
  logic gets vitest coverage in `tests/`.
- Schema changes need a migration (`npx prisma migrate dev --name ...`
  against a local database). Never edit an existing migration.
- If you change the UI noticeably, retake the screenshots
  (`scripts/capture-screenshots.mjs`) and update `docs/screenshots/README.md`.
- Update the docs your change makes wrong, in the same PR.

## Product rules that code must keep

- **Honesty first.** Never show an invented or inferred price. Unknown means
  unknown; stale prices say they are stale; ZYN Ultra never inherits the
  regular ZYN price; demo data is always labelled.
- **`priceCents` is nullable** (availability-only observations). Filter
  `priceCents: { not: null }` or use `selectLatestPrice` when reading prices.
- **Informational service for adults 21+.** No sales, checkout, delivery or
  marketing copy that promotes nicotine use.
- **No outbound calling code** in this app; calling stays a research topic
  (`research/`).

## Code conventions

- TypeScript strict; Next.js App Router; server components by default.
- Every new UI element needs light and dark variants (`dark:` Tailwind
  classes; the theme follows the system preference).
- Admin API routes go through `withStaff` / `requireRole`; never echo
  internal error messages to clients (`src/lib/admin-api.ts`).
- Structured data goes through `jsonLdString` (`src/lib/json-ld.ts`).
- Rate limits use `rateLimit()` from `src/lib/rate-limit.ts` so the
  `RATE_LIMIT_BACKEND=db` option keeps working.

## Where things are documented

- `HANDOFF.md`: current state, open items, gotchas, resume prompt.
- `DEVLOG.md`: dated log; add an entry when you finish a body of work.
- `docs/README.md`: index of design, architecture and operations docs.
- `docs/DECISIONS.md`: record any decision a future session might reverse
  without knowing why.
- `research/`: business due diligence (newer than `docs/BUSINESS_RESEARCH.md`).
