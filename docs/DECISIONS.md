# Decisions & assumptions

Running log of choices made autonomously, with reasoning. Reversible unless
noted.

**Numbering note:** IDs are kept as originally written because other docs
cite them, so 20–25 occur twice (Enhancement pass and Session 2) and 17–18
sit under Research. Cite an entry with its section, e.g. "Session 2 #23".
Superseded entries are marked in place, not removed.

## Product

1. **Working brand = "NicFinder"** — matches the repo name and the
   workbook's `NICfindER` idea; brand-neutral enough to add other pouch
   brands. No domain bought; availability not verified.
2. **Real stores ship without prices.** The workbook's April 2026 calls are
   not evidence of current prices; attaching any price to a real store
   would violate the honesty requirement. Real stores are a directory
   ("No price yet"); synthetic prices live only on fictional `isDemo`
   stores with visible badges + a site banner.
3. **Workbook store list sanitized & deduplicated** (27 unique from ~31
   rows): 801 W Addison's three rows (Shell/Circle K duplicates) became one
   "Shell / Circle K"; "Milito's" merged with the Mobil at 1106 W Fullerton
   (same phone); the two Exxons sharing a corporate phone were kept separate
   and seeded as an open DuplicateCandidate to demo the merge workflow.
   The `Links and Keys` sheet was never read into the repo; even the
   "no keys" workbook still contains 2 credential-like values — **owner
   should rotate anything that was in shared copies**.
4. **Age gate = 21+ interstitial cookie**, not ID verification — the norm
   for informational nicotine-adjacent sites; flagged for counsel in the
   research docs.
5. **Quantity selector fixed to 1/3/5/10** — covers observed deal shapes
   without a free-form input cluttering mobile.

## Technical

6. **Next.js 15 + Prisma + SQLite** per the brief's stated preference;
   prices as integer cents. (Next 15 chosen over 16 for ecosystem maturity
   with react-leaflet 5.) *SQLite superseded by Enhancement pass #19
   (PostgreSQL); Next 15 + Prisma + integer cents stand.*
7. **Custom session auth instead of NextAuth/Auth.js**: scrypt + hashed
   DB tokens is small, fully testable, has no beta-version churn, and the
   Google OAuth flow is ~80 lines implemented directly against Google's
   endpoints, active only when credentials exist. Honest config states
   required by the brief are easier this way.
8. **Geocoding without paid APIs**: bundled GeoNames ZIP centroids
   (CC BY 4.0, 41k rows, ~1.5 MB) for offline ZIP search + throttled,
   cached public Nominatim for street addresses. No API key, attribution
   in footer, `NOMINATIM_ENABLED=false` gives a fully offline demo.
9. **ExcelJS (read+write) instead of SheetJS** — maintained npm releases;
   papaparse for CSV.
10. **Import store-matching thresholds**: coords ≤75 m + name-bigram
    similarity ≥0.4; single-phone matches are overridden by conflicting
    address evidence (shared corporate lines exist in the real seed data).
    Ambiguity always flags rather than guesses.
11. **Latest price is computed, never stored** (append-only observations):
    makes reversal/moderation trivial and every displayed number
    explainable. Community publishes also mark the replaced observation
    SUPERSEDED for explicit authority.
12. **Reputation deltas** (+5 publish, +2 confirm, −3 stale confirm,
    −8 rejected, −15 abuse) are starting points; all *thresholds* are
    admin-configurable, deltas are constants in code (changing them
    retroactively would corrupt the audit trail).
13. **In-memory IP rate limiting for auth** is accepted for a
    single-process MVP; documented as a scale-out item. *Superseded:
    `RATE_LIMIT_BACKEND=db` moves the IP limits to a Postgres sliding
    window shared across instances (memory stays the default). The
    per-email failed-login limit remains in-memory per instance.*
14. **E2E uses the environment's preinstalled Playwright** via
    `createRequire` rather than pinning a browser download in deps; the
    script degrades with a clear message if Playwright is absent.
15. **Prisma's AI guard on `db push --force-reset`** respected: the test
    harness resets its own throwaway database and runs a plain
    non-destructive `db push` instead. *Updated for Postgres:* the database
    is `nicfinder_test` (`TEST_DATABASE_URL`; the name must contain "test"),
    and `tests/global-setup.ts` drops/recreates its `public` schema via
    `psql` before the push.
16. **No zod on the small route surface** — hand validation kept the
    dependency count down; revisit if the API grows.

## Enhancement pass (2026-11-04, second session block)

19. **PostgreSQL now** (user choice): Replit Autoscale's ephemeral
    filesystem would wipe SQLite, and Replit's built-in DB is Postgres.
    Fresh init migration; SQLite history removed. Key fix: Postgres aborts
    a transaction on any failed statement, so unique-collision tolerance
    moved from `create().catch()` to `createMany({skipDuplicates})`.
20. **Age gate switched from middleware redirect to client overlay**: a
    redirect gate blocks crawlers, which would make the SEO landing pages
    (the only viable acquisition channel) uncrawlable. Overlay = content
    indexable, interaction blocked. Verified in e2e.
21. **Replit Auth via trusted headers behind an explicit flag**
    (`REPLIT_AUTH_ENABLED`, deployment-only secret): headers are verified
    by Replit's proxy in production and forgeable everywhere else. Replit
    gives no verified email → placeholder email + `replitId` link.
22. **Coverage requests** (user's feature): dedupe = per-account per ZIP
    for members; per daily-salted hashed IP per ZIP (max 5 ZIPs/day) for
    guests. Raw IPs never stored. Admin ranks ZIPs by demand and shows
    covered/uncovered status.
23. **SEO pages are SSR, not ISR**: the root layout reads the age cookie,
    which makes the tree dynamic; at pilot scale per-request rendering is
    fine and always fresh.
24. **Watchlist capped at 100 stores/user**; saving is idempotent.
25. **Admin analytics uses single-hue labeled range/magnitude bars in
    semantic tables** (per dataviz guidance: single series → no legend; a
    table view is built in; values as text, color never carries identity).

## Research

17. Historical workbook economics (≈$0.07/call, $0.108/store) are treated
    as HISTORICAL and re-derived from Nov 2026 verified pricing in
    ELEVENLABS_CALLING_RESEARCH.md (base case ≈$0.19–0.20/observation with
    honest disclosure lengthening calls).
18. The historical "pose as a normal guy" agent prompt is **rejected**;
    the research doc specifies transparent automated-agent disclosure and
    flags TCPA wireless-consent as the gating legal risk requiring counsel
    before any calling.

## Session 2 (2026-11-04/05, autonomous overnight)

20. **Flags and deal reports are moderator-resolved, never auto-published.**
    Historical corrections and deal math are too error-prone for the
    corroboration shortcut; the review queue is the safety valve.
21. **Reliability is three explained tiers, never a percentage.** A number
    would be false precision; the tooltip lists every factor instead.
22. **Corroboration independence = distinct accounts on distinct networks**
    (stable salted ipHash, never raw IPs). Unknown/local origins store null
    and count as distinct — tightening must never brick corroboration where
    no proxy exists.
23. **No service worker with the PWA manifest.** Cached stale prices would
    violate the freshness promise; the app is useless offline anyway.
    *Superseded at the merge (Merge #33):* a network-first worker that
    precaches only `/offline`, icons and the manifest was kept. It never
    serves pages or prices from cache, so the freshness concern doesn't
    apply; offline users get an honest "you're offline" page instead of a
    browser error.
24. **In-app notifications only.** No email/external sending until a
    provider is configured and authorized; alerts collapse per store
    (newest wins) while resolution notices stay per-event.
25. **Automated import API ships disabled** (404 without IMPORT_API_KEY);
    webhooks HTTPS-only and HMAC-signed; identity tags share one source
    across channels so matching can't split.
26. **Dark mode is additive and media-based** (system preference, no
    toggle); OSM tiles are CSS-filtered rather than swapping tile
    providers. One commit, trivially revertible.
27. **npm audit majors deferred to the owner** (Next 16 / Prisma 7 /
    exceljs): breaking upgrades don't belong in an unattended session.
28. **OSM Overpass hours enrichment blocked** (API unreachable through this
    environment's proxy) — manual staff-maintained hours shipped instead,
    display-only, never used to compute "open now". Imports can also set
    hours (`hours` column) on new and matched stores.

## Merge of parallel sessions (2026-11-05)

Five parallel session branches were merged into `main`. Where features
overlapped, one version was kept:

29. **keen-planck screens as the base, keller features ported onto them.**
    Both branches had redesigned the search results, search page, store page
    and ZIP pages. keen-planck's versions were already wired to backend
    features that had been merged (availability-only rows, flags, store
    hours, saves, alerts), while keller's were mostly front-end, so porting
    keller's unique features onto keen-planck's screens was lower risk than
    the reverse. The owner chose this option; the alternative was two
    half-merged designs.
30. **Reliability tiers (`src/lib/reliability.ts`) over the confidence
    pill** (`src/lib/confidence.ts`, removed). Same goal; the tiers already
    explain every factor and follow Session 2 #21 (no percentages).
31. **The `/compare` page over `CompareDialog`.** A page is linkable and
    works without client state; the dialog was removed.
32. **`/how-it-works` is the canonical explainer; `/about` 301-redirects to
    it** (`next.config.ts`). Two pages saying the same thing would drift;
    the redirect keeps old links working.
33. **Kept the offline service worker, with `worker-src 'self'` in the
    CSP.** Network-first and never caches prices (see Session 2 #23); the
    nonce CSP's `strict-dynamic` would otherwise block worker registration.
34. **Overlapping security fixes were combined, not picked.** Each branch
    closed different holes: atomic claim + `ipHash` independence for
    corroboration; bulk import commit + import-time notifications; nonce
    CSP + API body-size guard. Choosing one side would have reopened the
    other's.
35. **Google OAuth never auto-links into a password account**, and links
    only verified Google emails. Local emails are unverified, so a
    pre-registered victim address could otherwise be taken over.
36. **Moderators cannot approve their own contributions.** Review exists so
    one person can't unilaterally publish a flagged change.
37. **`main` is protected: PRs only, the `verify` CI check required, no
    required approvals, up-to-date branches not required.** The owner is
    solo, so approvals would block every merge; parallel sessions would
    otherwise force each other to update and re-run CI after every merge. CI (lint, typecheck, vitest, build on
    `postgres:16`) is the gate; e2e is run manually.
