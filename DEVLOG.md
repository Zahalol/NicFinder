# DEVLOG

Newest entries first. Each entry is written by the handoff skill at the end of a session and records only
finished work, decisions, and lessons. Current state and open items live in HANDOFF.md.

---

## 2026-11-04/05 — Session 2 (autonomous UX & product)

**Done**
- 27 evaluate→build→test→critique cycles on the customer experience, each
  committed separately with before/after Playwright screenshots and logged in
  `UX_EXPERIMENTS_LOG.md` (what, why, testing, keep/discard). Highlights:
  mobile filter-bar redesign + priced-first results; desktop list+sticky-map
  split with map→list sync; transparent price-confidence pills
  (lib/confidence.ts) with reasons; history sparklines + trend;
  "worth the trip?" math (lib/trip.ts, IRS 70¢/mi); 3-store compare with
  persistent selection; one-tap confirm from result cards; deal-aware
  "what you'd pay" strip; cheaper-nearby + stale-price nudge on store pages;
  watchlist dashboard on the site-wide price policy; quick-search chips,
  filter memory, ZIP-typo recovery, nearest-covered-area suggestion;
  /price-drops, /about; ZIP-page stats + FAQ JSON-LD, store metadata +
  LocalBusiness/breadcrumb JSON-LD; PWA (icons, manifest, honest
  network-first SW + /offline); OS dark mode (admin pinned light);
  accessibility pass (skip link, focus-visible, aria); 20-image screenshot
  tour regenerated from a production build.
- Tests grew 53 → 72 (confidence, trip math, sparkline trend, zip-suggest);
  e2e suite updated for the new layouts and kept at 37 checks, all green.
- Fixed inherited bugs: `/admin/coverage` page silently dropped by a bare
  `coverage/` gitignore (anchored + restored); age-gate dismissal raced a
  slow server refresh (now hides on cookie POST success); map popups lost
  product context; ZIP search filter row overflowing small screens.

**Decided**
- No price data in structured markup (varies/excludes tax; nicotine ads
  policy caution) — directory facts only.
- Service worker is navigations-network-first forever: cached prices must
  never render as live. Offline = explicit /offline page.
- Confidence scoring is evidence-only (source base, age decay, confirms,
  disputes) and always shows its reasons; thresholds in lib/confidence.ts.
- Dark mode follows the OS with no toggle; /admin stays light.

**Learned**
- A bare directory name in .gitignore matches at any depth — it ate a page.
- SSR renders the mobile layout; hydration swaps in the desktop split, so
  tests must wait before clicking layout-dependent controls.
- Postgres + Prisma agent guard: reset dev DB via psql DROP/CREATE, then
  migrate+seed.

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
