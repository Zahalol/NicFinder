# Product requirements — NicFinder MVP

## One-liner

GasBuddy-calm price comparison for nicotine pouches: enter a US address or
ZIP, see nearby stores' latest reported ZYN prices with honest freshness
and verification signals. Informational only; adults 21+; no sales.

## Who it's for

Adult (21+) pouch users who buy weekly at gas stations/convenience stores
and care about a $1.50–$3.00 per-can spread between nearby stores
(BUSINESS_RESEARCH.md documents the dispersion thesis). Pilot: Chicago.

## Scope (MVP — all implemented)

### Anonymous browsing
- Search by ZIP (offline dataset), street address/city (Nominatim), or
  browser geolocation (optional button, never required).
- List beside a live map on desktop (pin click highlights the card), List/Map
  toggle on phones; radius 1–25 mi; sort by distance / price / recency;
  quantity selector (1/3/5/10 cans) that applies deal math; ZYN vs ZYN
  Ultra toggle (strength/flavor are stored and displayed when known, not
  required filters — anti-clutter). "Did you mean" for mistyped ZIPs,
  store-name matches, quick chips (near me, recent, neighbourhoods), and
  remembered filter choices per device.
- Store cards: name, address, distance, latest price, freshness,
  reliability tier (high/medium/low with reasons), source type, confirm
  count, deal badge, availability warnings, demo badge.
- Store page: prices per product line, deals with full terms (incl.
  "terms above N unknown"), deal-aware "What you'd pay" totals, price
  history sparkline and table, hours, mini-map, nearby alternatives,
  comments, directions and tap-to-call, caveat text.
- Two-store comparison (`/compare`), ZIP landing pages and a covered-areas
  index (`/zyn-prices`), recent price drops, `/how-it-works`.
- Honest states everywhere: **No price yet** (directory store), **stale**
  (> 21d), **No recent price** (> 120d), **out of stock**, **not carried**
  (availability-only reports carry no price), **no coverage** (anywhere in
  the US without tracked stores, with the nearest covered area and a
  coverage request), **geocode failed**.

### Accounts & community
- Email+password signup (scrypt, sessions) and Google OAuth when
  configured — the login page states plainly when it isn't.
- Confirm / dispute flows with corroboration + trusted auto-publish
  (COMMUNITY_REPUTATION.md); contribution history and reputation on the
  account page; public profiles show published activity only.
- Store comments with report/auto-hide/moderation; no reputation for
  comments.
- Flags on any price-history row or deal, community multi-can deal reports
  (always moderator-reviewed), one-tap confirm from search results.
- Watchlist with **in-app** price alerts and resolution notices; account
  settings (password change, display name, sign out everywhere).

### Data & admin
- CSV/XLSX import pipeline per IMPORT_CONTRACT.md (preview → commit →
  reversible), duplicate-store candidates with merge, manual store/price
  entry, review queue, configurable trust settings, metrics, audit log.

## Explicitly out of scope (MVP)
- **Any outbound calling** (dialer, ElevenLabs/Twilio code, schedulers) —
  research only, in ELEVENLABS_CALLING_RESEARCH.md.
- Receipt/photo evidence (schema-ready via Contribution JSON; deliberately
  deferred to keep core lean), push and **email** notifications (alerts are
  in-app only), native apps, additional brands in the catalog (the product
  toggle is data-driven; only ZYN lines are seeded), paid geocoding.
  (Deployment config for Replit and CI now exist; see REPLIT.md.)

## Key edge cases handled
- Deal applies at exactly N; unknown terms above N never extrapolated;
  deal with only a discount and no known regular price is unusable (shown
  uncertain); single-can ranking never mixes with 5-can ranking.
- Ultra price missing ≠ Ultra price equals regular (never inherited).
- Imports: duplicate rows in-file and across files; identical file
  re-upload; shared phone lines across stores; two brands at one corner
  (flag, don't merge); $99.99 typos quarantined; unlabeled product lines
  attached to regular with capped confidence and a note.
- Community: self-confirmation, duplicate corroboration, new-account
  trust-farming, confirming dead prices, drastic/absurd replacements.
- Search: ZIP-center approximation labeled; Nominatim down → ZIP fallback
  message; stores without coordinates excluded from geo results (visible
  via admin).

## Age & marketing posture

21+ gate on every page: a client overlay rendered by the root layout
(`AgeGateOverlay`); confirming sets a 30-day cookie via `/api/age`. The page
underneath stays in the HTML so search engines can index it, but it is
`inert` until the visitor confirms. Footer
and gate state the informational, non-sales nature and that nicotine is
addictive; under-21 link exits to FDA resources. No youth-oriented
imagery, no promotion of nicotine use, conservative copy throughout.
Regulatory review items (state AG sensitivities, ad-platform bans and
their marketing implications) are in BUSINESS_RESEARCH.md; counsel review
is flagged before any paid marketing or expansion beyond informational
listings.

## Future product lines

The schema and importer are brand-agnostic (`ProductLine` table, generic
contract). Adding On!/VELO/Rogue later is a seed row + data, not a code
change. Name ("NicFinder") deliberately not ZYN-specific; no domain
purchased, availability unverified (names research lives in the original
workbook; see BUSINESS_RESEARCH.md for positioning).
