# Architecture

## Stack

Next.js 15 (App Router, server components) · TypeScript strict · Tailwind 4 ·
Prisma 6 + **PostgreSQL** (local Postgres for dev; Replit/Neon in
production — see REPLIT.md) · Leaflet/OSM (map) · Vitest (unit +
integration) · Playwright for the e2e smoke test and screenshots. One
deployable unit — no microservices. Rendering is dynamic (prices change);
route handlers under `src/app/api/**` carry all mutations.

```
src/
  app/            pages + API routes (admin under /admin, APIs under /api)
  components/     client components (search box, results, map, forms)
  middleware.ts   API body-size guard + nonce CSP for pages
  lib/            domain logic — framework-free where possible, unit-tested
    import/       contract.ts (schema+aliases) · parse.ts (csv/xlsx) · engine.ts
    auth.ts page-auth.ts admin-api.ts db.ts validate.ts settings.ts audit.ts
    prices.ts deals.ts reputation.ts reliability.ts search.ts geocode.ts
    geo.ts zip-suggest.ts normalize.ts money.ts rate-limit.ts flags.ts
    deal-reports.ts comments.ts notifications.ts trip-value.ts duplicates.ts
    json-ld.ts import-api-auth.ts import-webhook.ts
    client/       api.ts (browser-side fetch helper)
  data/zip-centroids.csv   41k US ZIPs (GeoNames CC BY 4.0)
public/sw.js      network-first offline service worker (see below)
prisma/           schema, migrations, seed
tests/            vitest suites (isolated Postgres `nicfinder_test` DB)
scripts/          e2e-smoke.mjs, capture-screenshots.mjs, maintenance.mjs,
                  bench-search.ts, make-sample-xlsx.mjs
.github/workflows/ci.yml   `verify` job (see Operational notes)
```

Playwright is **not** a package dependency: `scripts/e2e-smoke.mjs` and
`scripts/capture-screenshots.mjs` load it at runtime via `createRequire`
(preinstalled in Claude cloud containers; elsewhere `npm i -D playwright`
first). `capture-screenshots.mjs` retakes `docs/screenshots/` against a
freshly migrated + seeded throwaway database. `bench-search.ts` seeds
synthetic stores into a DB whose name contains `bench`/`test` and times
`searchStores()`.

## Data model (prisma/schema.prisma)

- **Store** ⟷ **StoreIdentity** (EXTERNAL_ID / PHONE / ADDRESS values used
  for import matching) ⟷ **DuplicateCandidate** (flagged pairs, admin
  merge/dismiss; merge moves evidence and marks the loser `MERGED`).
- **ProductLine** — seeded `zyn`, `zyn-ultra`; the engine is brand-agnostic.
- **PriceObservation** — *append-only evidence log*. Status:
  `ACTIVE | SUPERSEDED | INVALIDATED | PENDING`. Never deleted; reversals
  and moderation only change status, preserving traceability. Price stored
  as **integer cents**; `priceCents` is **nullable** for availability-only
  observations ("not carried"/"out of stock" with no price — a price is
  never invented, and `selectLatestPrice` ignores price-less rows while
  `selectLatestAvailability` surfaces the newest explicit stock signal).
- **QuantityDeal** — min qty + (per-can price XOR per-can discount) +
  `appliesAboveMinQty` (nullable = unknown, UI refuses to extrapolate).
- **ImportBatch / ImportRow** — file hash, mapping used, per-row raw JSON,
  row hash, outcome, issues. The batch is the unit of commit/reversal.
  `commitBatch` (`src/lib/import/engine.ts`) re-validates rows, then in
  one transaction: atomically claims PREVIEW → COMMITTED, dedupes new
  stores within the batch (rows sharing external id/phone/address get one
  store), bulk-inserts stores/identities/observations/deals with chunked
  `createMany`, enriches matched stores (coords, phone, hours, external
  id), records availability-only rows as price-less observations, sends
  price-watch alerts to savers of changed stores and coverage-arrived
  alerts, and updates row outcomes with one `VALUES` join per chunk.
  Commit and reversal both fire the optional signed webhook (see API.md).
- **User / AuthSession / Contribution / Verification / ReputationEvent /
  Comment / CommentReport / ModerationAction / AuditEvent / Setting /
  GeocodeCache / Notification / RateLimitEvent / SavedStore /
  CoverageRequest.** Contribution kinds: `CONFIRM | DISPUTE |
  FLAG_OBSERVATION | FLAG_DEAL | REPORT_DEAL` (see
  COMMUNITY_REPUTATION.md).

### Latest-price policy (`src/lib/prices.ts`)

Displayed prices are **computed**, not stored: among ACTIVE observations of
a store+product, drop those older than `expireAfterDays` (120d), pick the
newest `observedAt`; ties break by source priority ADMIN > CALL > IMPORT >
COMMUNITY, then insert time. Results carry age + stale labeling
(`staleAfterDays`, 21d) and confirm/dispute counts. Community publishes
additionally mark the replaced observation `SUPERSEDED` to make authority
explicit. This makes import reversal trivial and keeps every number
explainable.

### Geocoding (`src/lib/geocode.ts`)

ZIPs resolve **offline** from the bundled GeoNames table (labelled
approximate). Street addresses go to Nominatim — throttled ≥1.1s between
calls per usage policy, cached in `GeocodeCache`, UA from env. Failures are
reported honestly (ZIP-only hint); negative results are not cached while
offline so the cache can't be poisoned. Search then does a bounding-box
prefilter + exact haversine + in-process sort (`src/lib/search.ts`) —
fine for thousands of stores; see Postgres path for scale.

## Security boundaries

- **Sessions**: 32-byte random tokens, stored **SHA-256-hashed**; httpOnly,
  SameSite=Lax, Secure in production; 30d expiry; suspended users' sessions
  are revoked. Passwords: scrypt (16B salt, N=16384 via Node defaults).
- **Authorization is server-side at every boundary**: every `/api/admin/*`
  route independently re-checks the role (`withStaff`/`withAdmin`), and
  every `/admin` *page* calls `requireStaffPage()` itself — the layout
  check is UX only (App Router layouts render in parallel with pages and
  don't re-run on client navigation, so a layout is not a security
  boundary). Settings writes are ADMIN-only. E2E verifies guests get 401s
  and redirects. Unexpected API errors return a generic message (internal
  error text is logged, never echoed).
- **Validation**: zod-free hand validation at route edges (small surface);
  prices/dates/coords validated on import and contribution paths;
  `cleanText()` strips NUL/control chars from all free text (Postgres
  `text` rejects \0); file uploads limited to 5 MB and .csv/.xlsx parsed
  server-side only; `src/middleware.ts` rejects non-GET `/api` requests
  whose Content-Length exceeds 64 KB (8 MB for the two upload paths,
  `/api/admin/imports` and `/api/imports`) with 413. Content-Length can be
  absent on chunked requests, so this is a first-line guard; the routes
  enforce the 5 MB file cap themselves.
- **Rate limits**: DB-counted per-user limits for contributions/comments
  (admin settings), plus comment edits 20/h per user. Anonymous IP limits
  (signup 10/h, login 20/15 min) go through a pluggable store chosen by
  `RATE_LIMIT_BACKEND`: `memory` (default, per process) or `db` (sliding
  window over `RateLimitEvent`, shared across instances); both fail open on
  storage errors. Login also has a **per-email** limit (10 *failed*
  attempts/15 min; successes don't count, so the owner can't be locked out
  by garbage attempts) that is always in-memory — the XFF-derived IP is
  client-influenced, so it is never the only key. The in-memory map sweeps
  idle buckets every 60 s and caps at 50,000 buckets (attacker-controlled
  keys must not grow unbounded).
- **Headers**: `next.config.ts` sets X-Frame-Options DENY, nosniff,
  strict-origin-when-cross-origin referrer and Permissions-Policy (self
  geolocation only). `src/middleware.ts` sets a per-request **nonce CSP** on
  pages in production only (dev needs unsafe-eval): `script-src 'self'
  'nonce-…' 'strict-dynamic'`, `style-src 'unsafe-inline'` (Leaflet inline
  styles), OSM tile host in `img-src`, `worker-src 'self'` (service
  worker), `frame-ancestors 'none'`, everything else `'self'`/`'none'`.
- **Age gate**: a full-screen client overlay rendered by the root layout
  whenever the 21+ cookie is absent — not a redirect, so public pages stay
  crawlable/indexable (SEO) while interaction is blocked until confirmed.
  The page behind the overlay is `inert` (no focus/clicks, out of the
  accessibility tree) so keyboard users cannot tab past the gate.
  Interstitial, not identity verification (industry norm for informational
  nicotine content; see PRODUCT_REQUIREMENTS).
- **Google OAuth**: `email_verified` must be true in userinfo or sign-in
  fails. A Google identity is linked by email only to an existing account
  that has **no password** — it never auto-links into a password account
  (local emails are unverified, so a pre-registered victim address could
  otherwise be hijacked); those users get `email-exists-use-password`.
  State cookie + 10s fetch timeouts.
- **Replit Auth**: `/api/auth/replit` trusts Replit's injected
  `X-Replit-User-*` identity headers ONLY when `REPLIT_AUTH_ENABLED=true`,
  a secret set exclusively on the Replit deployment where the proxy
  verifies them; anywhere else the headers are forgeable and the route
  refuses. Accounts link via `User.replitId`.
- **Import API**: `/api/imports` (`src/lib/import-api-auth.ts`) is a
  bearer-key endpoint, 404 unless `IMPORT_API_KEY` (≥16 chars) is set;
  constant-time compare. Outbound webhooks (`src/lib/import-webhook.ts`)
  go only to an https `IMPORT_WEBHOOK_URL`, HMAC-signed. See API.md.
- **Hashed IPs**: `SESSION_SECRET` is not a session key (sessions are
  random DB tokens); it is only the salt for hashed IPs used for
  corroboration independence and guest coverage-request dedupe. Rotating
  it changes every hash.
- No secrets in code; `.env.example` documents all configuration; the
  original research workbook (which held credentials) is gitignored.

## Offline service worker

`public/sw.js`, registered by `src/components/ServiceWorkerRegistrar.tsx`,
precaches only `/offline`, the icons and the manifest. Navigations are
always network-first and fall back to `/offline` (`src/app/offline/page.tsx`)
only when the network fails; pages and price data are never served from
cache, and cross-origin requests (map tiles) are untouched. `/about`
permanently redirects to `/how-it-works` (`next.config.ts`).

## PostgreSQL notes

The app began on SQLite and was migrated to Postgres (fresh init
migration). One behavioral difference bit during migration and is worth
remembering: **a failed statement inside a Postgres transaction aborts the
whole transaction** — tolerate expected unique-collisions with
`createMany({ skipDuplicates: true })` (ON CONFLICT DO NOTHING), never
`create().catch()`. Tests run against a dedicated `nicfinder_test`
database (name must contain "test"; reset in `tests/global-setup.ts`).
For scale later: PostGIS/earthdistance index to replace the bounding-box
prefilter, pgbouncer.

## Operational notes

- `DEMO_MODE=true` shows the synthetic-data banner; flip to `false` once
  real observations exist.
- Audit trail: imports (commit/reverse), settings changes, moderation,
  merges, manual prices — all in `AuditEvent`/`ModerationAction`, surfaced
  on /admin.
- CI (`.github/workflows/ci.yml`, job `verify`): `npm ci`, prisma
  generate, lint, typecheck, vitest, production build, against a
  `postgres:16` service. `main` is protected — changes land through PRs
  with `verify` passing. CI does not run e2e.
- The e2e smoke test (`npm run e2e`) boots the production build on :3100
  and exercises the full guest → community → admin loop.
- `scripts/maintenance.mjs` (hourly/daily): expires deals past
  `expiresAt`; prunes `RateLimitEvent` rows older than 1 day and READ
  notifications older than 90 days; resolves community proposals left
  uncorroborated for 21 days as REJECTED ("Expired"); purges expired auth
  sessions; reconciles cached `User.reputation` against the
  `ReputationEvent` ledger (users with no ledger events are reported, never
  overwritten); logs freshness/queue/coverage counts as JSON. Price
  evidence is never deleted.
- Settings (`src/lib/settings.ts`) are cached per process for 10 s; writes
  refresh the writing instance immediately, others converge within the TTL
  (disabled under tests).
- Concurrency invariants: state transitions claim their row *inside* the
  transaction (contribution publish/reject, import commit/reverse), and
  identical-content import commits serialize on a Postgres advisory lock —
  see [history/SECURITY_RELIABILITY_LOG.md](history/SECURITY_RELIABILITY_LOG.md)
  for the races these close.
