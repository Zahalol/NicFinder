# DEVLOG

Newest entries first. Each entry is written by the handoff skill at the end of a session and records only
finished work, decisions, and lessons. Current state and open items live in HANDOFF.md.

---

## 2026-11-05 — Merge of five parallel sessions, docs reconciled

**Done**
- Merged the five session branches into one (`main`, PR #1): research
  (`research/`), keen-planck (base), focused-darwin (security + CI) and
  beautiful-keller (UX); adoring-hypatia skipped (contained in
  beautiful-keller). Gates green after every step.
- Overlapping fixes were combined, not picked: atomic publish claims with
  network-distinct corroboration, focused-darwin's bulk import pipeline with
  keen-planck's alerts/hours/availability rows ported in, nonce CSP plus API
  body-size guard in one middleware.
- For the four screens both UX sessions redesigned, keen-planck's versions
  were kept and beautiful-keller's unique features ported in separate,
  tested commits. Duplicates removed: confidence pill, compare dialog,
  second sparkline, `lib/trip.ts`, `/about` (now a 301 to `/how-it-works`).
- Fixed what git could not see: two migrations creating `CommentReport`;
  keller pages reading the now-nullable `priceCents`; CSP blocking the
  service worker; two flaky e2e checks; and the size guard rejecting
  `POST /api/imports` uploads over 64 KB.
- `main` protected (PRs + `verify` check). Docs audited against the code and
  rewritten: new `HANDOFF.md`, `CLAUDE.md`, `docs/PARALLEL_SESSIONS.md`;
  session logs moved to `docs/history/`; superseded research flagged;
  screenshot tour retaken with `scripts/capture-screenshots.mjs`.

**Decisions** — recorded in `docs/DECISIONS.md` ("Merge of parallel
sessions", #29–#37).

**Lessons**
- Parallel sessions given overlapping briefs ("improve UX", "harden
  security") build the same features twice. Assign areas by files.
- Text conflicts are the easy part. The costly bugs were semantic: a
  nullable column, a duplicated migration, a security policy blocking
  another session's feature. Run the full gates after every merge step.
- Shared docs (HANDOFF, DEVLOG, README, screenshots) conflicted on every
  merge; one session should own them.

---

## 2026-11-04/05 — Session 2 (autonomous overnight marathon)

**Done** (74 improvement cycles, each its own commit; full evidence table in
docs/history/AUTONOMOUS_WORKLOG.md)
- **Found & fixed a lost page**: /admin/coverage existed in nav+e2e but the
  unanchored `coverage/` gitignore had silently kept it out of every commit.
- **Data honesty core**: nullable `priceCents` — availability-only
  observations ("not carried"/"out of stock") imported, searched, displayed
  and exported without ever inventing a price; honest states on search, store,
  ZIP and compare pages.
- **Community trust v2**: flag any listed observation (moderator upholds →
  append-only INVALIDATED with provenance); deal flags (ended vs invalid);
  community multi-can deal reports (always reviewed); corroboration now
  requires distinct accounts on distinct networks (stable salted ipHash,
  never raw IPs); comment-report dedupe (distinct reporters, restore clears
  the ledger); confirmations rejected on price-less rows.
- **Engagement loop**: in-app price alerts for saved stores (collapsed, actor
  excluded), per-event resolution notices, header bell, account alerts panel,
  /how-it-works, credibility profiles (trusted badge, accuracy), comment
  editing, account settings (password change revokes other sessions,
  sign-out-everywhere, display name).
- **Product depth**: reliability tiers with auditable reasons; price-history
  sparklines (display-policy step line, ≥3 obs); value-of-trip math;
  /compare + watchlist quick-compare; nearby alternatives; priced-only filter
  (URL-persisted); tap-to-call; per-store SEO metadata + LocalBusiness JSON-LD
  (real stores only) + share; data-driven product toggle (multi-brand ready).
- **Ops/hardening**: security pass (OAuth pre-registration takeover closed,
  error hygiene, rate-limit map cap); pluggable rate-limit storage
  (RATE_LIMIT_BACKEND=db for Autoscale); import fuzzing (NUL/length caps,
  15-test suite); 10k-store benchmark exposing + fixing arbitrary nearest-500
  truncation; catalog-wide duplicate scan; CSV price export (formula-injection
  guarded); pilot-economics dashboard; audit-log viewer; security headers;
  unused zod dependency removed; PWA manifest; demo seed exercises the new
  features; docs refreshed (roadmap/progress/reputation/architecture/demo).
- Three adversarial self-review passes over the session diff fixed 15 of
  their own findings (worklog rows 22, 38 and 67).
- Second half (rows 43-71): store retire/restore, the /admin/collect G1
  price-collection worksheet, staff/import-carried store hours, coverage-
  arrived notifications, the automated import API + HMAC-signed webhooks
  (roadmap #11, disabled by default), variant detail on community reports,
  save-from-search, searchStores test suite, and media-based dark mode
  (all routes verified, CSS-filtered dark map tiles).

**Decisions**
- Flags/deal reports never auto-publish — moderator-only (deal math and
  historical corrections are too error-prone for corroboration).
- Reliability is three explained tiers, never a percentage (false precision).
- No service worker with the PWA manifest (stale cached prices would violate
  the freshness promise).
- npm audit majors (Next 16 / Prisma 7) left for the owner — breaking
  upgrades don't belong in an unattended session.

**Lessons**
- An unanchored gitignore pattern (`coverage/`) can silently eat application
  routes; tests that only run in-session won't catch what never gets
  committed — e2e in CI would have.
- `take:` + bounding box without ORDER BY is a correctness bug at scale, not
  a perf tweak; the benchmark found it before production data could.

---

## 2026-11-04/05 — Session 2 (autonomous UX & product)

**Done**
- 40 evaluate→build→test→critique cycles on the customer experience, each
  committed separately with before/after Playwright screenshots and logged in
  `docs/history/UX_EXPERIMENTS_LOG.md` (what, why, testing, keep/discard). Highlights:
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
- Tests grew 53 → 73 (confidence, trip math incl. exact totals, sparkline
  trend, zip-suggest); e2e suite extended from 35 to 50 checks covering the
  new features (compare, confirm, signup, notes, PWA, suggestions), all green.
- Later cycles: covered-areas index, Ultra column on ZIP pages, per-store and
  per-ZIP dynamic OG images (bundled OFL fonts), store-name search matches,
  price-drops page, accessibility round 2 (live regions, reduced motion,
  dialog focus trap), footer nav, and a closing adversarial code review
  (10 findings fixed — incl. REVERSED-observation baselines in the
  price-change feeds and an unstyled offline fallback).
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
