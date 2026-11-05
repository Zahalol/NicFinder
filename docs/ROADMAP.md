# Roadmap

Prioritized post-MVP work. The business direction follows
[`research/99_FOUNDER_DECISION_BRIEF.md`](../research/99_FOUNDER_DECISION_BRIEF.md):
validate the price spread and B2B demand with **manual** collection before
spending on automation. Engineering open items are also listed in
[`HANDOFF.md`](../HANDOFF.md).

## Now: pilot

1. **Deploy on Replit** per [`REPLIT.md`](REPLIT.md), with
   `RATE_LIMIT_BACKEND=db` and the maintenance job scheduled. Replace demo
   credentials; attach a custom domain.
2. **Manual price-collection pilot** in Lake View + Lincoln Park (about 122
   stores, about $600–800; `research/05`, `research/99`), using
   `/admin/collect`. Measure the p90–p10 price spread (go threshold ≥$1.50
   per can). Turn `DEMO_MODE` off once real prices exist.
3. **Test B2B demand**: offer verified shelf-price data (≥$500/month is the
   research go threshold); `/admin/stores` already exports prices as CSV.
4. **Kill and go criteria**: use `research/10`'s penetration and B2B revenue
   gates (they replace the MAU gates in `BUSINESS_RESEARCH.md`).

## Next

5. **Email**: verification and password reset via a transactional provider
   (SPF/DKIM/DMARC); then email delivery for the in-app price alerts.
6. **Stronger anti-abuse**: email or phone verification or a minimum account
   age for corroborators; geo-plausibility checks; anomaly dashboards.
   (Distinct-network corroboration via salted IP hashes is already live.)
7. **Store enrichment** from OSM Overpass (brand metadata, hours where
   missing). Staff- and import-maintained hours already work.
8. **Multi-brand**: seed On!/VELO/Rogue product lines (the product toggle is
   already data-driven) and normalize per-pouch prices for the
   15 → 20-pouch can change.
9. **Receipt photo evidence** (size/type-limited upload, EXIF stripping,
   moderation) feeding a higher-confidence verification tier.
10. **Smaller product ideas** from the sessions: suggest a missing store,
    watchlist deal badges, view transitions, neighbourhood landing pages.
11. **Engineering**: run the e2e smoke test in CI; streaming XLSX parsing;
    the dependency majors behind current `npm audit` advisories.

## Later, gated

12. **Automated calling** (ElevenLabs + Twilio): NO-GO for now per
    `research/99`. Revisit only if the pilot shows a large spread and paid
    demand, and after the legal gate (TCPA, Illinois all-party consent;
    `research/01`). Design notes: `ELEVENLABS_CALLING_RESEARCH.md` and
    `research/04`–`05`.
13. **B2B price-intelligence product**, if item 3 finds paying customers.
14. **Expansion**: Chicago suburbs, then a second metro, ranked in
    `research/06`.

## Done

- **MVP**: search, store pages, community confirm/dispute with
  corroboration and reputation, imports, admin suite (see `PROGRESS.md`).
- **Platform**: PostgreSQL, Replit prep (`.replit`, health check, Replit
  Auth, maintenance job), CI on every PR, protected `main`, nonce CSP, API
  body-size guard, pluggable rate limiting, import API with signed webhooks.
- **Trust and honesty**: availability-only observations, observation and
  deal flags, community deal reports, reliability tiers, network-distinct
  corroboration, concurrency-safe publishing, state-gated moderation, in-app
  price alerts and resolution notices, `/how-it-works`.
- **Search and pages**: best-price card, value-of-trip math, two-store
  compare, nearby alternatives, "Priced only" and name filters, did-you-mean
  ZIPs, nearest covered area, quick chips, store-name matches, one-tap
  confirm, desktop list + map split view, remembered filters, "What you'd
  pay" strip, mini-map, ZIP landing pages (summaries, Ultra column, FAQ
  data, share images), covered-areas index, price drops, dark mode, PWA
  with offline page.
- **Admin**: coverage demand, analytics, pilot economics, collection
  worksheet, duplicate scan, CSV export, audit-log viewer, store hours.
