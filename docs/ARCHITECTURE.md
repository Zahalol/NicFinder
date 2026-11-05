# Architecture

## Stack

Next.js 15 (App Router, server components) · TypeScript strict · Tailwind 4 ·
Prisma 6 + **PostgreSQL** (local Postgres for dev; Replit/Neon in
production — see REPLIT.md) · Leaflet/OSM (map) · Vitest + Playwright. One
deployable unit — no microservices. Rendering is dynamic (prices change);
route handlers under `src/app/api/**` carry all mutations.

```
src/
  app/            pages + API routes (admin under /admin, APIs under /api)
  components/     client components (search box, results, map, forms)
  lib/            domain logic — framework-free where possible, unit-tested
    import/       contract.ts (schema+aliases) · parse.ts (csv/xlsx) · engine.ts
    auth.ts prices.ts deals.ts reputation.ts search.ts geocode.ts geo.ts
    normalize.ts money.ts settings.ts rate-limit.ts audit.ts admin-api.ts
    flags.ts deal-reports.ts comments.ts notifications.ts reliability.ts
    trip-value.ts duplicates.ts
  data/zip-centroids.csv   41k US ZIPs (GeoNames CC BY 4.0)
prisma/           schema, migrations, seed
tests/            vitest suites (isolated prisma/test.db)
scripts/          e2e-smoke.mjs, make-sample-xlsx.mjs
```

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
  server-side only; `src/middleware.ts` caps non-GET `/api` bodies (64 KB;
  8 MB for the import upload).
- **Rate limits**: DB-counted per-user limits for contributions/comments;
  in-memory IP **and per-email** limits for signup/login (the XFF-derived
  IP is client-influenced, so it is never the only key). The in-memory map
  sweeps idle buckets (attacker-controlled keys must not grow unbounded).
  Single-process MVP — move to Redis/upstash or a reverse-proxy limiter
  when horizontally scaled.
- **Headers**: X-Frame-Options DENY + `frame-ancestors 'none'`, nosniff,
  strict-origin-when-cross-origin referrer, Permissions-Policy (self
  geolocation only) — set in `next.config.ts`.
- **Age gate**: a full-screen client overlay rendered by the root layout
  whenever the 21+ cookie is absent — not a redirect, so public pages stay
  crawlable/indexable (SEO) while interaction is blocked until confirmed.
  The page behind the overlay is `inert` (no focus/clicks, out of the
  accessibility tree) so keyboard users cannot tab past the gate.
  Interstitial, not identity verification (industry norm for informational
  nicotine content; see PRODUCT_REQUIREMENTS).
- **Google OAuth**: `email_verified` is required from userinfo before any
  email-based account linking (unverified Google emails could otherwise
  take over a matching password account); state cookie + 10s fetch
  timeouts.
- **Replit Auth**: `/api/auth/replit` trusts Replit's injected
  `X-Replit-User-*` identity headers ONLY when `REPLIT_AUTH_ENABLED=true`,
  a secret set exclusively on the Replit deployment where the proxy
  verifies them; anywhere else the headers are forgeable and the route
  refuses. Accounts link via `User.replitId`.
- No secrets in code; `.env.example` documents all configuration; the
  original research workbook (which held credentials) is gitignored.

## PostgreSQL notes

The app began on SQLite and was migrated to Postgres (fresh init
migration). One behavioral difference bit during migration and is worth
remembering: **a failed statement inside a Postgres transaction aborts the
whole transaction** — tolerate expected unique-collisions with
`createMany({ skipDuplicates: true })` (ON CONFLICT DO NOTHING), never
`create().catch()`. Tests run against a dedicated `nicfinder_test`
database (name must contain "test"; reset in `tests/global-setup.ts`).
For scale later: PostGIS/earthdistance index to replace the bounding-box
prefilter, out-of-process rate limiting, pgbouncer.

## Operational notes

- `DEMO_MODE=true` shows the synthetic-data banner; flip to `false` once
  real observations exist.
- Audit trail: imports (commit/reverse), settings changes, moderation,
  merges, manual prices — all in `AuditEvent`/`ModerationAction`, surfaced
  on /admin.
- The e2e smoke test (`npm run e2e`) boots the production build on :3100
  and exercises the full guest → community → admin loop.
- `scripts/maintenance.mjs` (hourly/daily): expires stale deals, purges
  expired auth sessions, reconciles cached `User.reputation` against the
  `ReputationEvent` ledger (users with no ledger events are reported, never
  overwritten), and logs freshness counts.
- Settings (`src/lib/settings.ts`) are cached per process for 10 s; writes
  refresh the writing instance immediately, others converge within the TTL
  (disabled under tests).
- Concurrency invariants: state transitions claim their row *inside* the
  transaction (contribution publish/reject, import commit/reverse), and
  identical-content import commits serialize on a Postgres advisory lock —
  see SECURITY_RELIABILITY_LOG.md for the races these close.
