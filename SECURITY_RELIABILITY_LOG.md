# Security & Reliability Log

Maintained by the dedicated security/reliability session. Each entry records a
finding, its severity, the change made, tests, and the commit. Newest first.

Severity scale: **Critical** (exploitable now, data loss/compromise),
**High** (realistic abuse or data corruption), **Medium** (hardening,
defense-in-depth, availability), **Low** (hygiene).

---

## 2026-11-04 — Wave 2: admin page auth, resource hygiene

### H-4 (High) Admin pages relied on the layout for authorization
- **Finding**: every `/admin/*` page fetched privileged data with **no auth
  check of its own** — only `src/app/admin/layout.tsx` checked the role. In
  the App Router a layout is not a security boundary: layouts and pages
  render in parallel on the server, and a layout does not re-execute on
  client-side navigation between its children (Next.js' own guidance is to
  authorize next to the data). The admin API routes were already
  independently guarded; the pages were the gap.
- **Fix**: `src/lib/page-auth.ts#requireStaffPage()` (redirects non-staff)
  called at the top of all 8 admin page components, keeping the layout check
  as UX only.
- **Tests**: e2e already asserts guest `/admin` redirects to login; the gate
  suite re-run green.

### M-8 (Medium) Expired auth sessions accumulated forever
- **Finding**: `AuthSession` rows were only deleted lazily when the exact
  token was presented again; abandoned sessions persisted indefinitely
  (table growth + dead credential hashes at rest).
- **Fix**: `scripts/maintenance.mjs` now bulk-deletes sessions past
  `expiresAt` and reports `sessionsPurged`.

### M-9 (Medium) In-memory rate limiter grew without bound
- **Finding**: `memoryRateLimit`'s bucket map is keyed by attacker-controlled
  values (IPs, emails) and never evicted — a slow memory exhaustion vector.
- **Fix**: lazy sweep (every 60s on write) deletes buckets idle past the
  largest window (1h).

### L-2 (Low) Search page accepted absurd URL coordinates
- **Finding**: `?lat=99999&lng=−∞`-style values flowed into bounding-box and
  haversine math (harmless results, but NaN-propagating and cache-unfriendly).
- **Fix**: finite-range check (|lat| ≤ 90, |lng| ≤ 180) or the coordinates
  are ignored.

---

## 2026-11-04 — Wave 3: timing oracle, settings cache, toolchain advisories

### M-10 (Medium) Login response time revealed whether an account exists
- **Finding**: a login for an unknown email returned immediately (no scrypt
  work), while a known email cost ~50–100 ms of key derivation — a timing
  oracle for account enumeration (the signup 409 already reveals existence,
  but login probing is quieter and not signup-rate-limited).
- **Fix**: unknown-account path now verifies against a fixed dummy scrypt
  hash so both paths pay the same derivation cost.

### P-1 (Performance) Settings fetched from the DB on every request
- **Finding**: `getSettings()` is called on nearly every page/API request
  (search, contributions, SEO pages) and hit the database each time.
- **Fix**: 10-second per-process cache; writes refresh the writing process
  immediately, other instances converge within the TTL. Disabled under
  tests (which reset the DB between cases).

### L-3 (Low) Dev-toolchain advisories cleared where non-breaking
- vitest 3 → 4.1.12 (clears **2 critical** advisories: tinypool prototype
  pollution → RCE, @vitest/mocker path traversal — dev-only but worth
  zeroing). 66/66 tests pass on v4 unchanged.
- Remaining 13 advisories are all transitive pins inside next@15 (postcss),
  prisma (deepmerge-ts), exceljs (uuid) and typescript-eslint (minimatch):
  each fix requires a breaking major of the parent (next 16 / prisma 7 /
  exceljs 3-downgrade). Deferred deliberately; none is reachable with
  untrusted input in production (postcss/minimatch are build-time; exceljs
  parses staff-only uploads; deepmerge-ts is prisma CLI config).

---

## 2026-11-04 — Wave 1: audit + first hardening pass

Baseline at start: commit `2e3de05`, 53/53 vitest, lint/typecheck/build green.

### H-1 (High) Comment-report abuse: one account could hide any comment
- **Finding**: `POST /api/comments/[id]/report` incremented `Comment.reportCount`
  unconditionally. `autoHideReportCount` defaults to 3, so a single signed-in
  user calling the endpoint 3 times auto-hid any comment — a moderation bypass
  usable to censor other users (e.g. hide "prices here are wrong" warnings).
- **Fix**: new `CommentReport` table with `@@unique([commentId, userId])`
  (migration `20261104224030_comment_report_dedupe`); report logic extracted to
  `src/lib/comments.ts#reportComment`, counts **distinct** reporters, forbids
  reporting your own comment, refuses reports on non-visible comments.
  Moderator hide/restore also clears the report rows, so a restored comment
  starts with a clean slate instead of being one report away from re-hiding.
- **Tests**: `tests/security-hardening.test.ts` — same-user×5 keeps comment
  visible with reportCount 1; distinct reporters at threshold hide it;
  self-report rejected; hidden comment rejects further reports.

### H-2 (High) Double-publish race in community price publication
- **Finding**: `publishDispute` checked contribution status only *outside* its
  transaction (in callers). Two concurrent corroborations (or a moderator
  approve racing a corroboration) both published: duplicate ACTIVE
  observations for the same store/product, and the proposer earned the +5
  reputation **twice** — a reputation-farming primitive (rep ≥ 50 unlocks
  auto-publish of price changes, so inflated rep weakens the trust system).
- **Fix**: atomic claim inside the transaction —
  `updateMany({ where: { id, status: in [PENDING, CORROBORATING] }, data: { status: PUBLISHED … } })`;
  0 rows claimed → return `false`, nothing happens. `publishDispute` now
  returns a boolean; moderation APPROVE returns 409 when it loses the race.
  Moderation REJECT got the same claim treatment (no double −8 penalty, no
  reject-after-publish).
- **Tests**: sequential double-publish is a no-op; 3-way concurrent publish
  has exactly one winner, one ACTIVE observation, exactly one +5 event.

### H-3 (High) Import batch commit/reverse not transition-once
- **Finding**: `commitBatch` validated `status === "PREVIEW"` before the
  transaction; two concurrent commits of the same batch would both apply,
  duplicating stores/observations/deals. Same pattern in `reverseBatch`.
- **Fix**: atomic lifecycle claim inside each transaction
  (PREVIEW→COMMITTED, COMMITTED→REVERSED via conditional `updateMany`); the
  loser throws `BatchStateError`, mapped to HTTP 409 in the commit/reverse
  routes.
- **Tests**: double sequential commit throws and creates nothing extra;
  concurrent commits have exactly one winner with ≤1 observation per import
  row; double reverse throws.

### M-1 (Medium) Internal error messages leaked to admin API clients
- **Finding**: `withStaff`/`withAdmin` returned `e.message` on unexpected
  errors — Prisma errors include table/column names and query shape.
- **Fix**: unexpected errors now log server-side and return a generic
  "Server error."; a new `ApiError` carries intentional user-facing messages
  (used for the 409 batch-state responses).

### M-2 (Medium) Contribution `proposedQty` unvalidated
- **Finding**: `Number(body.proposedQty)` passed straight to Prisma: `NaN`
  or floats → 500 error; negative or absurd quantities stored (corrupting
  future deal analysis).
- **Fix**: `src/lib/validate.ts#parseOptionalQty` — optional, integer,
  1..100, else 400. Unit tested (NaN, floats, negatives, 0, 101, Infinity,
  "1e3").

### M-3 (Medium) Login rate limit defeated by rotating X-Forwarded-For
- **Finding**: login/signup limiter keyed only on the first entry of
  `x-forwarded-for`, which the client controls when proxies append. An
  attacker could brute-force one account by rotating the header.
- **Fix**: added a per-email limiter (10 attempts / 15 min) alongside the
  per-IP one. (Note: limiters are in-memory per process — acceptable for
  single-instance MVP; documented limitation for multi-instance deploys.)

### M-4 (Medium) Signup duplicate-email race returned 500
- **Finding**: `findUnique` check then `create` — concurrent signups with the
  same email hit the unique constraint and returned an unhandled 500.
- **Fix**: catch Prisma P2002 and return the same 409 as the pre-check.

### M-5 (Medium) No security response headers
- **Finding**: no clickjacking/MIME-sniffing/referrer protections.
- **Fix**: `next.config.ts` now sends `X-Frame-Options: DENY`,
  `Content-Security-Policy: frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a
  `Permissions-Policy` allowing only self geolocation (used by the search
  box). CSRF note: session cookie is `SameSite=Lax` and all state changes are
  POST/DELETE, which blocks cross-site cookie sends in modern browsers.

### M-6 (Medium) Store merge stranded watchlists
- **Finding**: merging duplicate stores moved observations/deals/
  contributions/comments but left `SavedStore` rows pointing at the MERGED
  store, silently breaking users' watchlists.
- **Fix**: merge now moves watchlist entries to the surviving store with
  dedupe (`skipDuplicates` on the unique user+store pair).

### L-1 (Low) Unused `zod` dependency carried a high-severity advisory
- **Finding**: `zod@3.25.76` (GHSA-mrhx-c7xc-m3w5, memory exhaustion) was in
  `dependencies` but imported nowhere.
- **Fix**: removed the dependency.

### M-7 (Medium) Repository tree was missing /admin/coverage (gitignore bug)
- **Finding**: e2e smoke failed at HEAD: `/admin/coverage` did not exist. The
  unanchored `coverage/` pattern in `.gitignore` (meant for test-coverage
  output) silently excluded `src/app/admin/coverage/` from every commit — a
  fresh clone was broken even though the feature "worked" in the original
  session's working tree.
- **Fix**: cherry-picked `15f174b` from `claude/keen-planck-rmqrm9` (a
  sibling session's fix, kept with its authorship): anchors the pattern to
  `/coverage/` and commits the page file.
- **Note**: the second e2e failure at HEAD ("sitemap includes ZIP pages") was
  an environment artifact — the production build ran against a pre-seed empty
  database, and the sitemap route statically cached the empty result for an
  hour (`revalidate = 3600`). Rebuilding after seeding resolves it; in
  production the hourly revalidation covers it.

### Dependency audit status (2026-11-04)
`npm audit`: 16 remaining advisories, all either **dev-only**
(vitest/tinypool/typescript-eslint toolchain — not shipped) or **bundled in
next@15.5.29** (postcss advisories; the fix is next@16, a breaking major —
deferred deliberately; next 15.5.29 is the newest 15.x). No production
runtime advisory remains actionable without a breaking major upgrade.

### Verification
- 66/66 vitest (13 new), lint clean, `tsc --noEmit` clean, production build
  OK, e2e smoke re-run after changes.
