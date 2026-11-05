# HANDOFF

## Current state
_Date: 2026-11-05 — Session 2 (autonomous UX/product session, branch `claude/beautiful-keller-yyipbw`)_

- NicFinder (ZYN price-comparison site, Chicago pilot, 21+ informational) is a
  **complete, verified MVP on PostgreSQL** with a substantially upgraded
  customer experience from 27 autonomous UX/product cycles (all documented
  with rationale, testing, and keep/discard calls in `UX_EXPERIMENTS_LOG.md`).
- All gates green at the branch tip: **72 vitest tests, 37-check Playwright
  e2e, lint, typecheck, prod build.**
- Session-2 UX additions (all additive; prior features intact): desktop
  list+sticky-map split view with map→list sync; redesigned mobile filter
  bar; priced-first results with collapsible no-price directory; transparent
  price-confidence pills (`src/lib/confidence.ts`); price-history sparklines
  + trend; "worth the trip?" savings-vs-driving math (`src/lib/trip.ts`);
  side-by-side compare (≤3 stores, selection persists); one-tap price
  confirm from result cards; "what you'd pay" deal-aware qty strip;
  cheaper-nearby links and stale-price nudges on store pages; watchlist
  dashboard upgrade; quick-search chips (near me / recents / neighborhoods);
  filter memory; ZIP-typo "did you mean"; nearest-covered-area suggestion;
  `/price-drops`; `/about`; enriched ZIP SEO pages (stats + FAQ JSON-LD);
  store-page metadata/JSON-LD/breadcrumbs; PWA (manifest, icons, honest
  network-first service worker + `/offline`); dark mode; accessibility pass;
  regenerated 20-image screenshot tour.
- Fixed from session 1: `/admin/coverage` page had been silently gitignored
  by a bare `coverage/` pattern (now anchored to `/coverage/`, page restored);
  age gate now dismisses instantly on cookie set (was a >1s flake).
- Outbound calling remains **not built** (research only; TCPA-gated).

## Open items
- [ ] Deploy to Replit per docs/REPLIT.md (owner's stated plan; not started)
- [ ] Change/replace seeded demo credentials before any shared deployment
- [ ] After Replit deploy: promote owner's Replit-auth account to ADMIN in DB
- [ ] Real Chicago price collection for the 27 directory stores (gate G1);
      demo data still populates the site (DEMO_MODE=true)
- [ ] Email verification / password reset not implemented (documented limitation)
- [ ] Owner to review `UX_EXPERIMENTS_LOG.md` recommendations (everything is
      marked Keep; compare tray + filter memory flagged "watch usage")
- [ ] Round-4 backlog leftovers: watchlist "worth the trip vs cheapest
      saved", View Transitions polish

## How to run things
```
# from the repo root (branch claude/beautiful-keller-yyipbw)
npm install
cp .env.example .env        # set SESSION_SECRET and Postgres DATABASE_URL
npx prisma generate
npx prisma migrate deploy
npm run db:seed             # demo users + Chicago directory + demo prices/history
npm run dev                 # http://localhost:3000

npm test                    # 72 tests (needs nicfinder_test DB)
npm run build && npm run e2e  # 37-check browser smoke on port 3100
```
Demo logins: docs/DEMO_GUIDE.md (admin@example.com / admin-demo-password).

## Gotchas (session-1 list still applies, plus)
- **`.gitignore` traps**: a bare directory name ignores it at any depth —
  `coverage/` once silently dropped `src/app/admin/coverage/` from commits.
- **Desktop vs mobile search layout**: ≥1024px renders the split view with
  NO List/Map toggle; the SSR HTML contains the mobile toggle and hydration
  removes it. e2e must wait for hydration before interacting (see the map
  check in scripts/e2e-smoke.mjs).
- **Service worker** (public/sw.js) registers on production builds only.
  It is deliberately network-first for all navigations — never make it cache
  pages or API data (stale prices shown as live would break the product's
  core honesty promise). Bump its VERSION when changing precached files.
- **Dark mode** is pure `prefers-color-scheme` (no toggle). `/admin` is
  pinned to a light panel via a `colorScheme: "light"` island.
- Prisma blocks destructive resets for agents; to reset the dev DB:
  `sudo -u postgres psql -c "DROP DATABASE nicfinder;" -c "CREATE DATABASE nicfinder OWNER nicfinder;"`
  then migrate + seed.
- Postgres transaction-abort, age-gate-as-overlay, append-only observations,
  import idempotency, CRLF, and admin-authz notes from session 1 all remain
  true (see git history of this file).

## Resume prompt
```
Project: /home/user/NicFinder (github.com/Zahalol/NicFinder, branch claude/beautiful-keller-yyipbw)
Read first: HANDOFF.md, UX_EXPERIMENTS_LOG.md, README.md
State: verified MVP + 27 UX/product cycles, all gates green, not yet deployed.
Next: owner review of experiments; Replit deployment per docs/REPLIT.md.
```
