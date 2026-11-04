# HANDOFF

## Current state
_Date: 2026-11-04 — Session 1_

- NicFinder (ZYN price-comparison site, Chicago pilot, 21+ informational) is a
  **complete, verified MVP on PostgreSQL, ready to deploy on Replit**.
- All gates green at commit `76c9401` on branch `claude/hopeful-feynman-mchyuv`
  (pushed): 53 vitest tests, 35-check Playwright e2e, lint, typecheck, prod build.
- Features live: search/list/map with best-price card and deal math, store pages,
  community confirm/dispute with reputation, watchlist, coverage requests,
  SEO ZIP pages + sitemap, CSV/XLSX import pipeline (preview/commit/reverse),
  full admin suite (imports, stores/duplicates, review, coverage demand,
  analytics, settings), Replit Auth provider, health endpoint, maintenance job.
- Outbound calling is deliberately **not built** — research only
  (docs/ELEVENLABS_CALLING_RESEARCH.md); gated on TCPA legal review.
- Docs reorganized under docs/ (index: docs/README.md); 17-screenshot tour in
  docs/screenshots/; git history is the full session narrative.

## Open items
- [ ] Deploy to Replit per docs/REPLIT.md (owner's stated plan; not started)
- [ ] Owner's Windows clone still targets the old SQLite setup — after `git pull`
      it needs a Postgres `DATABASE_URL` in `.env` (simplest: the Replit DB string)
- [ ] Change/replace seeded demo credentials before any shared deployment
      (admin@example.com / admin-demo-password is documented publicly)
- [ ] After Replit deploy: promote owner's Replit-auth account to ADMIN in DB
- [ ] Owner advised to rotate ElevenLabs/Twilio credentials exposed in old
      workbook copies — unknown whether done
- [ ] Real Chicago price collection for the 27 directory stores (business gate G1)
      not started; demo data still populates the site (DEMO_MODE=true)
- [ ] Email verification / password reset not implemented (documented limitation)

## Next steps
1. Create the Replit app + PostgreSQL database; copy its DATABASE_URL into the
   owner's local .env so laptop and Replit share one DB (docs/REPLIT.md §1–2).
2. Set Replit secrets (SESSION_SECRET, APP_URL, REPLIT_AUTH_ENABLED=true) and
   enable Replit Auth; deploy Autoscale (build/run preconfigured in .replit).
3. Run `npx prisma migrate deploy` + `npm run db:seed` in the Replit shell;
   promote the owner's account to ADMIN; verify /api/health.
4. Add a Scheduled Deployment: `node scripts/maintenance.mjs` (hourly or daily).
5. Collect real prices for the 27 real Chicago stores (manual/community/admin
   entry), then set DEMO_MODE=false and retire demo stores.
6. Watch /admin/coverage demand to choose expansion ZIPs.

## How to run things
```
# from the repo root (branch claude/hopeful-feynman-mchyuv)
npm install
cp .env.example .env        # set SESSION_SECRET and Postgres DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run db:seed             # demo users + Chicago directory + demo prices
npm run dev                 # http://localhost:3000

npm test                    # 53 tests (needs nicfinder_test DB; see below)
npm run build && npm run e2e  # 35-check browser smoke on port 3100
```
Postgres options (Docker one-liner / shared Replit DB / native) are in
README.md "Database setup". Tests expect
`postgresql://nicfinder:nicfinder_dev@localhost:5432/nicfinder_test`
(override with TEST_DATABASE_URL; the DB name must contain "test").
Demo logins: docs/DEMO_GUIDE.md.

## Gotchas
- **Postgres aborts the whole transaction on any failed statement** — for
  expected unique collisions use `createMany({ skipDuplicates: true })`,
  never `create().catch()` inside a transaction (bit us in the import engine).
- **Age gate must stay an overlay, not a redirect** — a redirect blocks
  crawlers from /zyn-prices/* pages, the only viable acquisition channel
  (nicotine ads are banned on Google/Meta).
- **Data honesty invariants**: observations are append-only (status changes,
  never deletes); displayed prices are computed in src/lib/prices.ts; ZYN
  Ultra never inherits regular prices; demo data stays labeled (Store.isDemo).
- **Imports must stay idempotent** (file + row content hashes) — tests cover it.
- **REPLIT_AUTH_ENABLED only on Replit deployments**: it trusts proxy-injected
  X-Replit-User-* headers, forgeable anywhere else.
- `src/data/zip-centroids.csv` must keep LF endings (.gitattributes enforces;
  Windows CRLF once silently broke all ZIP search).
- A crashed e2e run can orphan `next-server` processes holding the port —
  `pkill -f next-server`.
- Prisma blocks destructive resets for AI agents; the test harness resets only
  the test schema via SQL (tests/global-setup.ts) — keep it that way.
- Every /api/admin/* route re-checks the role server-side (withStaff/withAdmin);
  the admin layout redirect is not the security boundary.
- Never commit .env, real *.xlsx workbooks (gitignored — the original held
  credentials), or model identifiers in repo artifacts.

## Resume prompt
```
Project: /home/user/NicFinder (github.com/Zahalol/NicFinder, branch claude/hopeful-feynman-mchyuv)
Read first: HANDOFF.md, README.md, docs/REPLIT.md
State: verified Postgres MVP at 76c9401, all tests green, not yet deployed.
Next: walk the owner through the Replit deployment in docs/REPLIT.md (DB, secrets, Replit Auth, Autoscale).
```
