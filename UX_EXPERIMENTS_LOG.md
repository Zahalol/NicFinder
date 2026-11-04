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

---

## Cycle 8 — "What you'd pay" quantity table on store pages

**Problem.** Deals were described in prose ("buy 5+ — $1.00 off per can")
and the search page's qty toggle was the only way to see multi-can totals —
on a store page a heavy buyer still had to do arithmetic.

**What changed.** Store-page product cards with an active deal now show a
4-cell strip (1 / 3 / 5 / 10 cans) with total, per-can, and a teal tint on
deal-applied cells, computed through the existing `lib/deals.ts` math —
including its honesty rules: quantities whose deal terms are unknown render
"?" with a "we don't guess" footnote rather than extrapolating. Stores
without a deal skip the strip (it would be bare multiplication).

**Why selected.** #3 in ranked backlog; serves the multi-can buyer persona
explicitly named in the product brief; reuses tested deal math (no new
logic to verify beyond rendering).

**Testing.** Screenshots of both deal shapes: discount-above-min
(5/10 teal) and unknown-above-min (shows "?" at 5/10). Typecheck/lint
green; 68 tests unaffected.

**Recommendation: Keep.**

---

## Cycle 9 — Watchlist dashboard upgrade

**Problem.** The account watchlist was a bare name+number list that used the
*raw newest observation of any product line* — inconsistent with the site's
display policy (no expiry/staleness handling) and with no way to see at a
glance which saved store is the best buy.

**What changed.** Watchlist rows became cards computed through
`selectLatestPrice` on the ZYN-regular line (the same policy as everywhere
else): price + age + stale warning, confidence badge, demo chip, and a
teal-ringed "Cheapest on your watchlist" highlight when ≥2 saved stores have
comparable prices. Stores without a recent ZYN price say so instead of
showing an old/other-line number.

**Why selected.** #4 in ranked backlog; also fixed a real display-policy
inconsistency (the old code could show an expired or Ultra price as the
store's number).

**Testing.** Playwright: signed in as demo user, saved two stores, verified
cheapest highlight, confidence badges, freshness text. Typecheck/lint green.

**Recommendation: Keep.**

---

## Cycle 10 — ZIP SEO landing-page enrichment

**Problem.** `/zyn-prices/[zip]` pages (the main acquisition channel) buried
the answer: a visitor from Google had to scan a table to learn what ZYN
costs in the area, and search engines had no structured answer to quote.

**What changed.**
- Stats strip up top: Cheapest / Median / Highest / Last update, computed
  from the same reported prices the table shows.
- Cheapest callout now also names the best multi-can deal in the area.
- FAQPage JSON-LD ("How much does a can of ZYN cost in {city} {zip}?") with
  an honest computed answer including the price range, median, and the
  usual caveats — only emitted when real reported prices exist.
- Nearby-ZIP chips labeled with city names ("Chicago 60657" vs bare "60657").

**Why selected.** #5 in ranked backlog; organic search is the only viable
acquisition channel (nicotine ads banned), and the answer-first format +
structured data target featured snippets without any fabricated data.

**Testing.** JSON-LD verified present and well-formed in rendered HTML;
mobile screenshot shows stats cards + deal callout; typecheck/lint green.

**Recommendation: Keep.**

---

## Cycle 11 — "Latest price reports" feed on the homepage

**Problem.** The homepage was static marketing; nothing signaled that the
data is alive or gave a returning visitor something new to glance at.

**What changed.** A compact server-rendered feed of the 5 newest active
observations (store, line, ZIP, age, price) with a change-vs-prior-report
arrow (green down / amber up) computed against the store+line's previous
recorded observation. Demo rows carry the demo chip as everywhere else.

**Why selected.** Return-visit hook + "the data moves" trust signal, cheap
(one query + N small lookups at N=5), zero new client JS.

**Testing.** Screenshot shows feed with ▾ $0.30 deltas on seeded history
stores; typecheck/lint green.

**Recommendation: Keep.**

---

## Cycle 12 — Store-page location mini-map + share button

**Problem.** Store pages had no visual sense of place (only a text address
and an external OSM link), and sharing a find meant copying the URL bar.

**What changed.** A non-interactive 160px Leaflet mini-map (clean pin dot,
OSM attribution, loading skeleton, all zoom/drag disabled so it never traps
mobile scrolling) under the store header; a Share button next to Save using
the native share sheet with a clipboard fallback ("Link copied ✓").

**Testing.** Screenshot verified pin + layout; header actions wrap cleanly
at 390px. Typecheck/lint/tests green.

**Recommendation: Keep** (mini-map), **Keep** (share — ~40 lines, no deps).

---

## Cycle 13 — One-tap "✓ Still this price?" confirm from search results

**Problem.** Confirming a price required opening the store page and finding
the contribute panel — too much friction for the highest-value, lowest-effort
community action (freshness confirmations), which the product brief calls out
("make contributing accurate information easier").

**What changed.**
- `lib/search.ts` exposes the latest observation's id in results.
- Signed-in members see a small "✓ Still this price?" chip in each priced
  result card's meta row; it POSTs the existing `kind: CONFIRM` contribution
  (same endpoint, rate limits, self-confirm guard, and reputation flow as the
  store-page panel), flips to "Thanks ✓", and refreshes the confirm count.
  Signed-out visitors see nothing (no nag).
- Errors from the API (already-confirmed, rate limit, superseded price) are
  shown inline as returned.

**Why selected.** Community-flywheel: every confirmation raises the
confidence tier (Cycle 6) and freshness of the number everyone else sees.

**Testing.** Playwright signed in as a demo member: 12 chips rendered,
clicking one recorded a real verification ("Thanks ✓" + "✓ 1 confirm"
appears after refresh). Typecheck/lint green.

**Recommendation: Keep.**

---

## Cycle 14 — Dark mode (prefers-color-scheme)

**Problem.** No dark theme: at night the all-white UI is harsh, and
nicotine-pouch price checks skew mobile/evening. The PWA (Cycle 5) also
looked out of place on dark-mode phones.

**What changed.**
- `globals.css`: CSS variables + `color-scheme` switch via
  `prefers-color-scheme` (no toggle UI — follows the OS, zero JS).
- Tailwind `dark:` variants across every public surface and shared
  component (layout chrome, home, search + filters + best-price gradient,
  result cards/badges/compare dialog, store pages incl. qty strip, account,
  auth forms, ZIP pages, age gate, error/404, skeletons). Semantic colors
  keep their meaning (teal accents, amber warnings, emerald positives) at
  dark-appropriate shades.
- Dark `themeColor` meta for the browser UI; maps intentionally stay light
  (standard practice, tiles are third-party).
- `/admin` is deliberately pinned to a light panel (`color-scheme: light`
  island) — staff tooling, not worth the dark sweep risk.

**Testing.** Full gate re-run: 68 vitest, production build, all 37 e2e
checks green. Dark screenshots verified for home, search (incl. compare
dialog + tray), store page, ZIP page, login; two sweep artifacts found and
fixed (high-confidence pill missing dark variant, pill wrapping).

**Recommendation: Keep.** Follows the OS preference; light mode untouched.

### Round-3 idea backlog (generated after Cycle 14, ranked)
1. **"Cheaper nearby" on store pages** — built (Cycle 15).
2. Accessibility pass: skip link, focus-visible rings, aria on filter groups.
3. Store-page SEO: LocalBusiness/Offer JSON-LD + breadcrumbs.
4. Remember last filters (qty/radius/sort) per device and reapply.
5. FAQ/about page (trust + long-tail SEO).
6. "Did you mean <ZIP>?" recovery on geocode failure.
7. Service-worker offline shell for the PWA.
8. Suggest-a-missing-store flow (needs new model + admin queue — coordinate
   with the core session first).
9. View-transition polish on search→store navigation.
10. Per-pouch normalization (skipped: ZYN cans are uniform 15-pouch).

---

## Cycle 15 — "Cheaper nearby" on store pages

**Problem.** A visitor landing on a store page (via search, share, or SEO)
had no signal when a better deal sat two blocks away — the comparison
intelligence lived only on the search page.

**What changed.** When the viewed store has a current ZYN price, the page
searches 2 miles around *the store itself* and lists up to two cheaper
priced stores: price, savings per can, and distance "from here", linking to
their pages. Never rendered without real reported prices; demo stores keep
their chip.

**Testing.** Verified on the $8.99 out-of-stock demo store: strip lists
$5.59 (-$3.40, 1.2 mi) and $5.99 (-$3.00, 1.5 mi) alternatives. Hidden on
the cheapest store. Typecheck/lint green.

**Recommendation: Keep.** High-value cross-navigation; one extra bounded
query per store view (same code path as search).

---

## Cycle 16 — Accessibility pass

**What changed.** Skip-to-content link (hidden until keyboard focus) +
`#main` landmark; consistent `:focus-visible` outline in the accent color;
`aria-pressed` on the List/Map toggle; filter groups are labeled
`role=group`s (visual caption aria-hidden) with caption contrast bumped
stone-400→500; the compare dialog focuses its close button on open.

**Testing.** Keyboard walk: first Tab on a content page focuses "Skip to
content" and jumps to main; toggles announce state. Full suite green.

**Recommendation: Keep.**

---

## Cycle 17 — Trust & SEO: store JSON-LD, breadcrumbs, "How NicFinder works"

**What changed.**
- Store pages emit `ConvenienceStore` + `BreadcrumbList` JSON-LD
  (directory facts only — deliberately **no price markup**: prices vary,
  may exclude tax, and nicotine offers in merchant markup are a policy
  minefield).
- New `/about` ("How NicFinder works"): where prices come from, what the
  confidence pill means, freshness/honesty rules, deal math incl. the 70¢/mi
  assumption, contribution flow, and "what NicFinder is not". Linked from
  the footer on every page; added to the sitemap.

**Why selected.** The product's differentiator *is* the honesty system —
now it's explained to users and search engines in one place.

**Testing.** JSON-LD verified in rendered store HTML; /about screenshots
(light+dark via shared classes); typecheck/lint/tests green.

**Recommendation: Keep.**
