# HANDOFF

## Merge of parallel sessions (2026-11-05)

Five cloud sessions worked on this repo at the same time, each on its own
branch off the same commit. They were merged into
`claude/relaxed-ptolemy-u7r8fp`, in this order, with all quality gates green
after each step (lint, typecheck, vitest, prod build, e2e):

1. `exciting-franklin`: business research docs in `research/` (no overlap).
2. `keen-planck`: the largest branch (described below); the base.
3. `focused-darwin`: security/reliability hardening + GitHub Actions CI.
   Overlapping fixes were combined, not picked: atomic publish claims +
   IP-independent corroboration, the bulk import pipeline + alerts/hours/
   availability rows, CSP + API body-size guard. Duplicate `CommentReport`
   migration removed (migrations verified to equal the schema).
4. `beautiful-keller`: UX cycles 1-43. For the four screens both
   sessions redesigned (search results, search page, store page, ZIP
   pages) keen-planck's versions were kept, and keller's unique features
   were then ported in separate commits: did-you-mean ZIPs, nearest covered
   area, quick-search chips, store-name matches, one-tap confirm, desktop
   list+map split view with pin-to-card sync, remembered filters, deal-aware
   "what you'd pay" strip, store mini-map, breadcrumbs, ZIP-page price
   summary + Ultra column + FAQ JSON-LD. keller's standalone additions
   (price drops, covered-areas index, OG images, offline service worker,
   PWA icons) were kept as-is.
5. `adoring-hypatia`: skipped; everything but a stale screenshot refresh
   was already contained in `beautiful-keller`.

Features built twice were resolved to one implementation: reliability
badges (keen-planck) over the confidence pill; `/compare` page over the
compare dialog; keen-planck's history sparkline and trip-value math;
`/how-it-works` canonical, with `/about` 301-redirecting to it. keller's
`UX_EXPERIMENTS_LOG.md` still describes the removed duplicates; read it as
history.

Gates at merge HEAD: **171 vitest tests**, **83-check e2e**, lint,
typecheck, prod build, `migrate deploy` from scratch.

**Working in parallel again?** Give each session a separate area, branch
from the latest `main`, open a PR per session and merge often, and keep
shared logs (this file, DEVLOG, README, screenshots) out of parallel work.
Most conflicts in this merge came from sessions editing the same screens
and these docs.

## Current state (Session 2, before the merge)
_Date: 2026-11-05 — Session 2 (autonomous overnight marathon)_

- NicFinder remains a **complete, verified Postgres MVP, ready to deploy on
  Replit** — now substantially deeper after 74 verified improvement cycles
  on branch `claude/keen-planck-rmqrm9` (pushed; contains the full history
  from `claude/hopeful-feynman-mchyuv`, which is now stale).
- **Review the session via `AUTONOMOUS_WORKLOG.md`** (one row per cycle:
  what/why/files/evidence/limitations/Keep-Consider recommendation) and
  `AUTONOMOUS_BACKLOG.md` (remaining ranked ideas). Every cycle is its own
  commit with a descriptive message.
- Quality gates, all green at HEAD: **132 vitest tests** (Postgres test
  schema), **56-check Playwright e2e** (including a two-user trust-loop and
  a dark-mode regression guard),
  lint, typecheck, prod build. The whole migration chain was verified to
  `migrate deploy` + seed cleanly onto a virgin database.
- Headline additions since Session 1:
  - **Data honesty**: availability-only observations ("not carried"/"out of
    stock", `priceCents` now nullable — no invented prices anywhere),
    observation + deal flagging with moderator resolution, community
    multi-can deal reports (moderator-reviewed), reliability tiers
    (high/medium/low with auditable reasons), price-history sparklines.
  - **Engagement**: in-app price alerts for saved stores, resolution notices
    for contributors, /how-it-works trust page, contributor credibility
    profiles, comment editing, account self-management (password change,
    sign-out-everywhere).
  - **Product depth**: value-of-trip math, two-store compare (+watchlist
    quick-compare), nearby alternatives, priced-only + name filters,
    save-from-search, data-driven product toggle (multi-brand verified by a
    dry run), per-store SEO + JSON-LD + share, **dark mode** (system
    preference, incl. the map), store hours end to end.
  - **Ops/hardening**: security pass (OAuth linking, report dedupe, error
    hygiene), corroboration network-independence (salted ipHash), pluggable
    rate-limit storage (`RATE_LIMIT_BACKEND=db` for Autoscale), import fuzz
    hardening, nearest-500 search fix (found by the new 10k benchmark),
    duplicate-store scan, CSV price export, pilot-economics dashboard,
    audit-log viewer, security headers + nonce CSP, PWA manifest,
    **automated import API + signed webhooks** (disabled by default),
    coverage-arrived notifications, the /admin/collect G1 worksheet.

## Open items
- [ ] Deploy to Replit per docs/REPLIT.md (unchanged plan; set
      `RATE_LIMIT_BACKEND=db` there — new)
- [ ] Change/replace seeded demo credentials before any shared deployment
- [ ] After deploy: promote owner's account to ADMIN; verify /api/health
- [ ] Real Chicago price collection (gate G1) still not started; DEMO_MODE=true
- [ ] Email verification / password reset still not implemented (password
      *change* now exists for signed-in users)
- [ ] Rotate ElevenLabs/Twilio credentials from old workbooks — status unknown
- [ ] `npm audit`: remaining advisories need breaking majors (Next 16,
      Prisma 7, exceljs) — deliberate owner decision, not done unattended

## Next steps
1. Skim `AUTONOMOUS_WORKLOG.md` top to bottom; everything is reversible
   per-commit if you disagree with a change.
2. Deploy per docs/REPLIT.md §1–2 (DB, secrets incl. RATE_LIMIT_BACKEND=db,
   Replit Auth, Autoscale) + scheduled `node scripts/maintenance.mjs`.
3. Collect real prices for the 27 Chicago stores; `/admin/economics` now
   models what an automated refresh would cost, `/admin/coverage` shows
   demand, `/admin/stores` exports current prices as CSV.

## How to run things
```
# branch claude/keen-planck-rmqrm9
npm install
cp .env.example .env        # set SESSION_SECRET + Postgres DATABASE_URL
npx prisma generate && npx prisma migrate deploy
npm run db:seed             # demo users + Chicago directory + demo prices
npm run dev                 # http://localhost:3000

npm test                    # 128 tests (needs nicfinder_test DB)
npm run build && npm run e2e  # ~48-check browser smoke on port 3100
DATABASE_URL=...nicfinder_bench npx tsx scripts/bench-search.ts  # perf bench
```
Demo logins & new-feature demo flows: docs/DEMO_GUIDE.md (updated).

## Gotchas (Session 1 list still applies, plus:)
- `priceCents` is **nullable** now: availability-only rows carry no price.
  Any new query that reads prices must filter `priceCents: { not: null }`
  or go through `selectLatestPrice` (which already does).
- `.gitignore` had an unanchored `coverage/` that silently ignored
  `src/app/admin/coverage/` — fixed (anchored to `/coverage/`); watch for
  that pattern with other tool-output names.
- Contribution kinds are now `CONFIRM | DISPUTE | FLAG_OBSERVATION |
  FLAG_DEAL | REPORT_DEAL`; generic "approve/reject pending contribution"
  code must branch on kind (the moderation route shows how).
- Corroboration independence uses a **stable salted ipHash**; unknown/local
  origins store null (counts as distinct) — don't "fix" that by hashing a
  fallback constant, it bricks corroboration behind no proxy.
- Restoring a hidden comment clears its CommentReport ledger on purpose.
- e2e creates a throwaway user per run (unique email) in the dev DB.
- A crashed e2e still orphans `next-server` on port 3100: `pkill -f next-server`.

## Resume prompt
```
Project: /home/user/NicFinder (github.com/Zahalol/NicFinder, branch claude/keen-planck-rmqrm9)
Read first: HANDOFF.md, AUTONOMOUS_WORKLOG.md, README.md, docs/REPLIT.md
State: verified Postgres MVP + 74 autonomous improvement cycles, all gates green, not yet deployed.
Next: owner reviews AUTONOMOUS_WORKLOG.md, then Replit deployment per docs/REPLIT.md.
```
