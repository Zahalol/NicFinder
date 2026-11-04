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
- List + map toggle; radius 1–25 mi; sort by distance / price / recency;
  quantity selector (1/3/5/10 cans) that applies deal math; ZYN vs ZYN
  Ultra toggle (strength/flavor are stored and displayed when known, not
  required filters — anti-clutter).
- Store cards: name, address, distance, latest price, freshness, source
  type, confirm count, deal badge, availability warnings, demo badge.
- Store page: prices per product line, deals with full terms (incl.
  "terms above N unknown"), price history table, comments, directions
  link, caveat text.
- Honest states everywhere: **No price yet** (directory store), **stale**
  (> 21d), **No recent price** (> 120d), **out of stock**, **no coverage**
  (anywhere in the US without tracked stores), **geocode failed**.

### Accounts & community
- Email+password signup (scrypt, sessions) and Google OAuth when
  configured — the login page states plainly when it isn't.
- Confirm / dispute flows with corroboration + trusted auto-publish
  (COMMUNITY_REPUTATION.md); contribution history and reputation on the
  account page; public profiles show published activity only.
- Store comments with report/auto-hide/moderation; no reputation for
  comments.

### Data & admin
- CSV/XLSX import pipeline per IMPORT_CONTRACT.md (preview → commit →
  reversible), duplicate-store candidates with merge, manual store/price
  entry, review queue, configurable trust settings, metrics, audit log.

## Explicitly out of scope (MVP)
- **Any outbound calling** (dialer, ElevenLabs/Twilio code, schedulers) —
  research only, in ELEVENLABS_CALLING_RESEARCH.md.
- Receipt/photo evidence (schema-ready via Contribution JSON; deliberately
  deferred to keep core lean), push/email notifications, native apps,
  price alerts, multi-brand catalogs (schema supports more product lines),
  paid geocoding, deployment/infra.

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

21+ interstitial gate (cookie, 30d) in middleware on every page; footer
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
