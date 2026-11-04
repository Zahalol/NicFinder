# DEVLOG

Newest entries first. Each entry is written by the handoff skill at the end of a session and records only
finished work, decisions, and lessons. Current state and open items live in HANDOFF.md.

---

## 2026-11-04 — Session 1

**Done**
- Built the full MVP from an empty repo (commits `6ae8a38`…`76c9401`, all pushed):
  Next.js 15 / TypeScript / Tailwind 4 / Prisma, search with list/map (Leaflet/OSM),
  offline ZIP geocoding (41k GeoNames centroids) + cached Nominatim, store pages,
  quantity-deal math, append-only price observations with computed latest-price
  policy, scrypt/session auth + optional Google OAuth, 21+ age gate,
  CSV/XLSX import pipeline (header aliasing, validation, cautious store matching,
  in-file + cross-import dedupe, preview/commit/reverse, error reports),
  community trust engine (confirm/dispute, corroboration independence, trusted
  auto-publish within guardrails, reputation events), comments + moderation,
  admin suite (overview, imports, stores/duplicate merge, review queue, settings).
- Seeded sanitized data: 27 real Chicago stores as a no-price directory,
  8 fictional demo stores with labeled synthetic prices, 3 demo users.
- Enhancement pass (owner-directed): migrated SQLite → PostgreSQL (fresh init
  migration, test DB harness); Replit prep (.replit Autoscale config,
  /api/health, Replit Auth provider gated by REPLIT_AUTH_ENABLED,
  scripts/maintenance.mjs for Scheduled Deployments, docs/REPLIT.md);
  coverage-request demand capture + /admin/coverage; best-price-nearby card;
  watchlist (SavedStore); SEO pages /zyn-prices/[zip] + sitemap/robots;
  admin analytics (ZIP dispersion, freshness, contribution trends); loading
  skeletons, error/404 pages, metadata; mobile search-bar overflow fix;
  store-page back-link fix.
- Research docs with dated Nov-2026 citations: docs/ELEVENLABS_CALLING_RESEARCH.md
  (ElevenLabs $0.08/min, Twilio $0.014/min, ≈$0.19/observation base case,
  TCPA wireless-consent as gating risk) and docs/BUSINESS_RESEARCH.md
  (Nicotinly thin competitor; IL tax pushed cans to ~$8–10; conditional GO
  with kill criteria).
- Verification kept green throughout: 53 vitest tests, 35-check Playwright e2e,
  lint, typecheck, prod build. 17-screenshot tour committed to docs/screenshots/.
- Docs reorganized under docs/ with index; HANDOFF.md established at root.
- Supported the owner's local Windows setup (execution policy, interrupted
  npm install, prisma generate) and fixed two bugs they hit: CRLF checkout
  breaking ZIP search; missing prisma generate step in docs.

**Decided**
- Owner choices: migrate to Postgres now; integrate Replit Auth; polish (not
  rebrand) the UI; build coverage requests + best-price card + watchlist +
  SEO pages + admin analytics; deploy target is Replit.
- Working brand "NicFinder"; real stores carry no prices until really observed;
  calling system stays research-only pending legal review.
- Full decision log with reasoning: docs/DECISIONS.md (25 entries).

**Learned**
- Postgres aborts transactions on any failed statement — replaced
  `create().catch()` collision-tolerance with `createMany({skipDuplicates})`.
- A redirect-style age gate would have blocked all SEO indexing; converted to
  an overlay so /zyn-prices/* stay crawlable.
- Windows git autocrlf corrupted the bundled ZIP dataset (fixed with
  .gitattributes + tolerant parser); killing an npx wrapper leaves
  `next-server` orphans — e2e now kills its process group.
