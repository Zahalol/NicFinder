# Autonomous backlog

Prioritized ideas for the unattended improvement marathon (2026-11-04).
Status: `todo` | `in-progress` | `done` | `blocked` | `rejected`.

| # | Idea | Impact | Effort | Confidence | Risks | Status |
|---|------|--------|--------|------------|-------|--------|
| 1 | Build missing `/admin/coverage` page (nav linked, e2e expected, file absent) | High — broken admin link, red e2e | S | High | None | done |
| 2 | Availability-only observations: represent "ZYN not carried / out of stock" imports honestly without inventing a price (schema supports `availability`, price is required today) | High — data honesty core value | M | Med | Import contract change | done |
| 3 | Security audit pass: authz on every mutating route, rate limiting coverage, open redirect, XSS in comments, session fixation | High | M | High | None (read + patch) | done |
| 4 | Historical-observation disputes (dispute any listed observation, not only displayed price) with provenance | Med-High | M | Med | Moderation flow churn | done |
| 5 | Mobile UX audit: search → nearest → price readability; loading/empty/error states; keyboard support | Med-High | M | Med | Subjective | done (first pass) |
| 6 | Pluggable rate-limiter storage abstraction (memory default, Postgres-backed option) | Med — deploy readiness | M | High | Over-engineering | done |
| 7 | Price history sparkline / freshness visualization on store page (no implied trends on sparse data) | Med | M | Med | Misleading viz if careless | done |
| 8 | Two-store side-by-side comparison | Med | M | Med | UI clutter | done |
| 9 | Value-of-trip calculator (5-can savings vs added distance, stated assumptions) | Med | S-M | Med | Invented costs — keep assumptions explicit | done |
| 10 | Import contract fuzz tests (malformed CSV/XLSX, huge files, weird encodings, CRLF, BOM) | Med — robustness | S-M | High | None | done |
| 11 | Price reliability score (age + source + corroboration + disputes), transparent formula | Med | M | Med | False precision | done |
| 12 | No-map low-clutter quick compare mode for mobile | Low-Med | S | Med | Duplicate of list view? | partially covered by 'Priced only' filter |
| 13 | Admin pilot economics dashboard (coverage, obs age, est. acquisition cost from configurable assumptions) | Low-Med | M | Low | Speculative | done |
| 14 | Benchmark search with 10k synthetic stores; index/queries as justified | Med | M | Med | Needs careful measurement | done |
| 15 | PWA manifest + basic offline shell | Low | S | Low | Complexity creep | todo |
| 16 | In-app price-watch alerts (no email), building on watchlist | Med | M | Med | Needs notification UI | done |
| 17 | Admin duplicate-suggestion improvements (fuzzy name+geo matching quality) | Med | M | Med | — | done |
| 18 | Accessibility sweep: focus traps, aria on map/list toggle, contrast | Med | S-M | High | — | todo |
| 19 | SEO store-page metadata + structured data review (21+ informational constraints) | Low-Med | S | Med | Legal care | done |
| 20 | Cross-platform setup validation (Windows CRLF, docs accuracy) | Low | S | High | Can't test Windows here | todo |

## Second tranche (generated 2026-11-04 ~23:40 UTC after first backlog exhausted)

| # | Idea | Impact | Effort | Confidence | Risks | Status |
|---|------|--------|--------|------------|-------|--------|
| 21 | "Nearby alternatives" on store pages: up to 3 stores within 2mi with current price + distance, cheaper flagged | Med-High — keeps users inside the comparison loop | S-M | High | None | done |
| 22 | Pending-dispute visibility on store page ("N reports awaiting review/corroboration") + /how-it-works trust explainer | Med — roadmap asked for pending vs published clarity | M | Med | Copy quality | todo |
| 23 | Admin CSV export of current displayed prices (owner backup / spreadsheet workflows) | Med | S | High | None | todo |
| 24 | PWA manifest + icons (installable, no service worker complexity) | Low | S | Med | Complexity creep if SW added | todo |
| 25 | User profile credibility: clearer reputation explanation on /users/[id] | Low-Med | S | Med | — | todo |
| 26 | Comment editing (editedAt exists in schema, no UI) | Low | S | Med | — | todo |
| 27 | Watchlist quick-compare: compare two saved stores from /account | Low | S | Low | duplicate of /compare entry | todo |
| 28 | Store-page share/copy-link affordance with OG metadata check | Low | S | Med | — | todo |
| 29 | Maintenance job: hook duplicate scan + notification pruning | Low-Med | S | Med | tsx dependency in cron | todo |
| 30 | DEVLOG/HANDOFF refresh + owner summary (end-of-session) | High (handoff) | S | High | — | todo |
