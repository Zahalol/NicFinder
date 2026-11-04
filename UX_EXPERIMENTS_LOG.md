# UX Experiments Log

Running log of autonomous UX/product experiments on branch
`claude/beautiful-keller-yyipbw`. Each entry: what was built, why, how it was
tested, and a Keep / Consider / Discard recommendation. Experiments are kept
deliberately isolated (component-level, additive) so any one can be reverted
by itself.

Baseline screenshots (before any changes) and after-shots for each cycle were
taken with Playwright at 390×844 (mobile) and 1280×850 (desktop); they live
outside the repo (session scratchpad) to keep the repo lean — rerun
`npm run dev` + the shoot script in any session to regenerate.

---

## Cycle 1 — Mobile filter bar redesign + priced-first results grouping

**Problem.** On mobile the search filter row rendered as a cramped,
3-line word-soup (`ZYN | ZYN Ultra | Buying 1 3 5 10 can within 1mi 2mi…sort`)
with mixed inline labels; and the results list buried the 7–8 stores that
actually have prices among ~28 "No price yet" directory rows — the main thing
a visitor came for (prices) was below the fold and interleaved with noise.

**What changed.**
- `src/app/search/page.tsx`: new labeled filter groups (`PRODUCT / CANS /
  WITHIN / SORT BY`) rendered as segmented pill controls in a single
  horizontally-scrollable row on mobile (no wrapping), wrapping normally on
  desktop. Sort options renamed to human words: Nearest / Cheapest / Newest.
  Still plain links (server-rendered, crawlable, no JS required).
- `src/components/SearchResults.tsx`: results split into "with reported
  prices" (always visible) and a collapsed, dashed "N nearby stores with no
  reported price yet — Show" section with a contribution nudge. When *no*
  store has a price the full directory shows expanded (honest empty-ish
  state preserved). Card markup extracted to one `StoreCard`.
- `src/components/StoreMap.tsx`: map popup "Details →" links now preserve the
  selected product (they previously dropped query context).
- `src/components/SearchBox.tsx`: placeholder shortened ("ZIP or address" —
  the old one truncated on small screens); 📍 emoji button replaced with a
  crosshair SVG icon.

**Why selected.** Highest-traffic surface (search is the core loop), worst
mobile rendering found in baseline screenshots, zero schema/backend risk.

**Testing.** `npm test` (53), lint, typecheck green. Playwright screenshots
mobile+desktop before/after: filter bar now one scrollable row; priced stores
all above the fold; directory section collapses/expands.

**Commit.** See git log ("Cycle 1").

**Recommendation: Keep.** Pure presentation; large mobile usability win.

---

## Cycle 2 — Price-history sparkline + trend on store pages

**Problem.** Price history existed only as a table of rows; nothing showed a
shopper whether a store's price is rising, falling, or steady — a core
"should I trust / wait / go now" signal.

**What changed.**
- `src/components/PriceSparkline.tsx`: new dependency-free, server-rendered
  SVG sparkline (line + soft area fill + per-observation dots, newest dot
  emphasized) and a pure `trendSummary()` helper.
- `src/app/stores/[id]/page.tsx`: each product-line card now plots every
  recorded observation (active + superseded) from the last 180 days when
  there are ≥2 points, with a plain-language trend line, e.g.
  "▾ down $0.80 over 3 mo of reports" (green for down, amber for up).
- `prisma/seed.ts`: 3 demo stores get a short synthetic ZYN history
  (SUPERSEDED rows, clearly marked "Synthetic demonstration price history",
  idempotent guard) so the feature is demonstrable; real stores untouched.
- `tests/sparkline.test.ts`: unit tests for `trendSummary` (ordering,
  same-day null, flat series, rise/fall). Suite now 57 tests.

**Why selected.** Price-history visualization was a stated product priority;
zero client JS (SVG is server-rendered), additive, no backend risk.

**Testing.** 57 vitest green, typecheck/lint clean; mobile screenshot shows
the declining-price sparkline + trend caption on Demo Fuel Stop #1.

**Recommendation: Keep.** Small, honest (plots only real recorded
observations), reads instantly.

---

## Cycle 3 — "Worth the trip?" savings-vs-driving math

**Problem.** The best price is often not the nearest store. GasBuddy-style
apps leave the "is the detour actually worth it?" math to the user; for
multi-can buyers this is the decision that matters.

**What changed.**
- `src/lib/trip.ts`: pure `compareTrip()` — total savings at the chosen
  quantity vs the nearest priced store, extra *round-trip* miles, driving
  cost at the IRS standard mileage rate (70¢/mi, documented in-code and
  in the UI footnote), and the net verdict.
- Best-price card on `/search` now shows one extra line when the best-priced
  store is farther than the nearest priced store and saves money:
  "Worth the trip? vs <nearest> (0.3 mi): save $2.50 on 5 cans for +0.4 mi
  round trip (≈$0.28 driving) — **worth the detour**" (or "the closer store
  may win" in amber when net is negative).
- `tests/trip.test.ts`: null cases (best is nearest / no savings / bad qty),
  exact math, and the qty-scaling property (1 can not worth it, 10 worth it).

**Why selected.** Directly serves the stated "savings vs driving distance"
product idea; quantity-aware so it rewards the multi-can use case; pure
function keeps it testable and removable (one card row).

**Testing.** 62 vitest green; screenshots confirm sensible copy at qty=1
(hidden when meaningless) and qty=5.

**Recommendation: Keep.** Unique differentiator vs the thin competitor set;
transparent assumptions.

---

## Cycle 4 — Side-by-side store comparison

**Problem.** Choosing between 2–3 candidate stores means bouncing between
cards/pages and holding numbers in your head — especially with deals and
quantity math involved.

**What changed.**
- Priced result cards get a small "+ Compare" toggle (max 3 stores, only
  offered when ≥2 priced stores exist). Selected cards show a teal ring.
- A sticky bottom tray lists the selection with Clear / Compare buttons.
- `src/components/CompareDialog.tsx`: bottom-sheet (mobile) / modal (desktop)
  attribute table — per-can at chosen qty, total, multi-can deal, distance,
  freshness, source, confirmations, stock — with best price/distance cells
  highlighted; Escape and backdrop close; names link to store pages.

**Why selected.** Direct product-brief ask; zero backend (uses data already
on the page); isolated: delete `CompareDialog.tsx` + the marked
"EXPERIMENT (Cycle 4)" blocks in `SearchResults.tsx` to remove.

**Testing.** Playwright click-through: select 3, tray appears, dialog renders,
Escape closes, no page errors; 62 tests/typecheck/lint green. Screenshots in
session scratchpad.

**Recommendation: Keep** (watch usage; if nobody compares, drop the tray —
removal is 15 minutes).

---

## Cycle 5 — PWA installability, app icon/favicon, map declutter

**Problem.** No favicon, no manifest, no icons: the site couldn't be
"added to home screen" as an app, and browser tabs showed a blank icon.
On the map, ~28 unpriced stores rendered as big gray "?" chips that
visually drowned out the handful of real price chips; stale prices looked
identical to fresh ones; popup links dropped the product context (fixed in
Cycle 1).

**What changed.**
- `src/app/icon.svg`: new brand mark (teal rounded square, white map pin
  with a $ coin) — served by Next as the favicon automatically.
- `public/icons/`: 192/512 PNGs, a maskable 512 (safe-zone padded), and a
  180px apple-touch-icon, all rendered from the same SVG.
- `src/app/manifest.ts`: web app manifest (standalone display, teal theme,
  categories) → Chrome/Android install prompt eligibility; iOS metadata via
  `appleWebApp` + apple-touch-icon; `themeColor` viewport export.
- `src/components/StoreMap.tsx`: unpriced stores are now small neutral dots
  (still clickable, popups intact); stale prices get a faded-teal chip;
  fresh chips sit above dots (zIndexOffset). Legend of meaning is implicit:
  chip = price, dot = no price yet.
- Map view: taller on phones (55vh, min 360px) and auto-scrolls into view
  when toggled, since the best-price card pushed it below the fold.

**Why selected.** Mobile-first/PWA was a stated priority; the map was the
weakest surface left on the core loop. No service worker yet (offline
caching is a bigger, riskier bite — logged as a future idea).

**Testing.** `/manifest.webmanifest` serves correct JSON; icons verified
visually; map screenshot shows chips vs dots; typecheck/lint/62 tests green.

**Recommendation: Keep.**

---

## Interlude — restored /admin/coverage + e2e suite back to green

Found while running the full smoke suite: a bare `coverage/` in `.gitignore`
(meant for test-coverage output) had silently kept the prior session's
`src/app/admin/coverage/` page out of git — admin nav linked to a 404 and the
e2e check failed. Anchored the ignore to `/coverage/`, rebuilt the page
(read-only demand ranking: requests/ZIP, member split, magnitude bars), and
updated two e2e checks that asserted the pre-Cycle-1 flat list ("No price
yet" is now revealed by expanding the directory section; the check verifies
both the summary line and the expansion). All 37 smoke checks green.

---

## Cycle 6 — Price-confidence indicator

**Problem.** Trust signals (source, age, confirmations, disputes) were
scattered as separate fragments the visitor had to synthesize; "how much
should I believe this $5.99?" had no glanceable answer. Reliability
indicators were a stated product priority.

**What changed.**
- `src/lib/confidence.ts`: transparent `computeConfidence()` — source base
  (staff/call 70, import 60, community 55), gentle-then-steep age decay
  (0.8/day ≤7d, then 1.5/day, capped −45), +12 per confirmation (max 3),
  −18 per dispute, clamped 0–100 → tiers: high ≥65, medium ≥35, low.
  Returns human-readable `reasons` with every score.
- `ConfidenceBadge` (badges.tsx): emerald/stone/amber pill with dot;
  tooltip lists the reasons. Added to search result cards (replacing the
  bare source word, which moved into the reasons) and store-page price
  cards; store page also prints the reasons inline (phones have no hover).
- `tests/confidence.test.ts`: tier behavior, decay monotonicity,
  community+confirm flywheel (lone report = medium, 1 confirmation = high),
  confirm cap, dispute severity, clamping, unknown-source fallback.

**Why selected.** Top-ranked in the round-2 idea list (10 ideas, ranked by
impact/effort below); display-only synthesis of existing evidence — no new
data collected, honesty preserved by always exposing the "why".

**Testing.** 68 vitest green; screenshots verify badges on search cards and
store pages.

**Recommendation: Keep.**

### Round-2 idea backlog (generated after Cycle 5, ranked)
1. **Price-confidence indicator** — built (Cycle 6).
2. Home/empty-state quick wins: recent searches (localStorage), popular ZIP
   chips, clearer geolocate CTA (Cycle 7).
3. Multi-can cost table (1/3/5/10) on store pages (Cycle 8).
4. Watchlist dashboard: saved stores w/ current prices + cheapest highlight
   (Cycle 9).
5. ZIP SEO page enrichment: stats, best deal, internal links (Cycle 10).
6. One-tap "price still right?" confirm from search cards (needs sign-in UX
   care; later).
7. "What changed nearby" price-drops feed (return-visit hook).
8. Share a store/price via navigator.share (mobile).
9. Dark mode (prefers-color-scheme) across public pages.
10. Service-worker offline shell for the PWA (riskier; last).

---

## Cycle 7 — Quick-search chips: "near me", recents, neighborhoods

**Problem.** The home and empty search states offered one text input and a
tiny easter-egg link; a returning phone user had to retype their ZIP every
visit, and new visitors had no scent of where coverage exists.

**What changed.**
- `src/components/QuickSearches.tsx`: chip row under the search box —
  "⌖ Near me" (geolocation), the visitor's last 5 searches (localStorage
  only, device-private, with a "clear" control), and, until they have any
  recents, popular pilot-area chips labeled by neighborhood
  ("Lincoln Park 60614", "Lakeview 60657", …).
- `SearchBox` records successful submissions via `rememberSearch()`
  (try/catch-guarded for private mode).
- Home page + `/search` empty state render the chips; home copy no longer
  buries the pilot-area hint in a one-word link.

**Why selected.** #2 in the ranked backlog; biggest returning-mobile-user
friction (retyping a ZIP) for ~70 lines of isolated code.

**Testing.** Playwright: fresh visitor sees neighborhood chips; after one
search the row shows "60614 · clear"; chips navigate. Typecheck/lint green.

**Recommendation: Keep.**
