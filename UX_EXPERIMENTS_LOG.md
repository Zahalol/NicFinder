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
