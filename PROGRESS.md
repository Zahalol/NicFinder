# Progress

_Last updated: 2026-11-04 (enhancement pass, same day)._

## Enhancement pass ✅ (second block)

- [x] **PostgreSQL migration** (Replit-ready): fresh init migration, test
      harness on a dedicated `nicfinder_test` DB, PG transaction-abort fix
      (`createMany skipDuplicates`), docs updated
- [x] **Replit prep**: `.replit` (Autoscale build/run), `/api/health`,
      Replit Auth provider (`REPLIT_AUTH_ENABLED` header-trust model),
      `scripts/maintenance.mjs` for Scheduled Deployments, `REPLIT.md`
- [x] **Coverage requests**: guest+member demand capture on no-coverage
      states, hashed-IP dedupe, /admin/coverage demand ranking
- [x] **Best-price-nearby hero card** on search results
- [x] **Watchlist**: save/unsave stores, account watchlist with latest prices
- [x] **SEO**: /zyn-prices/[zip] landing pages, sitemap.xml, robots.txt,
      and age gate converted from redirect to overlay so pages stay
      crawlable
- [x] **Admin analytics**: per-ZIP price dispersion ranges, freshness
      buckets, weekly contribution bars
- [x] **UX polish**: loading skeletons, error + 404 pages, metadata/OG
      template, mobile search-bar overflow fix, back-link fix
- [x] **Verification**: 53 vitest + 35-check e2e smoke + lint + typecheck +
      prod build all green; e2e now kills its process group and fails fast
      on stale ports

## Status: MVP complete and verified ✅

All milestone work finished in this session; all gates green at the
latest commit on `claude/hopeful-feynman-mchyuv`.

### Done
- [x] Repo scaffold: Next 15 / TS strict / Tailwind 4 / Prisma 6 (SQLite)
- [x] Schema + migration (`prisma/migrations/*_init`) + idempotent seed
      (27 sanitized real Chicago stores, no prices; 8 fictional demo
      stores with synthetic prices/deals; 3 demo users)
- [x] Core libs: money(cents), deal math, latest-price policy, haversine +
      bbox, offline ZIP geocoder (41k ZIPs) + cached Nominatim, normalize/
      match helpers, settings, audit, rate limits
- [x] Import pipeline: CSV/XLSX parse, header aliases + manual remap,
      validation with issue codes, cautious store matching, in-file &
      cross-import dedupe, preview→commit→reverse, error-report CSV
- [x] Auth: scrypt + hashed session tokens; Google OAuth (env-gated);
      age gate middleware
- [x] Public UX: home, search (list/map, radius/sort/qty/product), store
      detail (history, deals, comments), account, public profiles
- [x] Community: confirm/dispute, corroboration independence, trusted
      auto-publish within guardrails, reputation events incl. stale-confirm
      penalty, comment reporting/auto-hide
- [x] Admin: overview metrics + audit log, imports UI, stores + duplicate
      merge + manual entry, review queue, settings editor
- [x] Tests: **51 vitest** (all passing) + **20-check Playwright smoke**
      (all passing) + lint + typecheck + prod build clean
- [x] Docs: README, PRODUCT_REQUIREMENTS, ARCHITECTURE, IMPORT_CONTRACT,
      COMMUNITY_REPUTATION, DECISIONS, DEMO_GUIDE, ROADMAP
- [x] Research (web-verified, dated citations): ELEVENLABS_CALLING_RESEARCH,
      BUSINESS_RESEARCH

### How to verify
```bash
npm install && npx prisma migrate deploy && npm run db:seed
npm test          # 51 tests, isolated prisma/test.db
npm run build
npm run e2e       # needs the build + seeded dev.db; 20 checks
```

### Known limitations (honest list)
- Google OAuth & email delivery need real credentials (documented in
  .env.example); login page states when unconfigured.
- In-memory IP rate limiting is single-process (ARCHITECTURE.md).
- Availability-only import rows (price-less "not carried") create the
  store but no observation record (noted in engine; candidate for an
  AvailabilityObservation table).
- Map tiles require network (OSM); everything else runs offline.
- No deployment configuration (out of scope by instruction).

### Next session should start with
1. Read DECISIONS.md + this file.
2. Pick from ROADMAP.md "Now" items (deploy prep or real-data pass).
3. Keep the e2e suite green (`npm run e2e`) after any route changes.
