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
