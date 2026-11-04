# Roadmap (post-MVP, prioritized)

## Done since v1
- ~~Postgres migration~~ ✅ (Replit-ready; see REPLIT.md)
- ~~Deploy prep~~ ✅ (.replit, health check, Replit Auth, maintenance job)
- ~~Coverage-demand capture~~ ✅ · ~~watchlist~~ ✅ · ~~SEO ZIP pages +
  sitemap~~ ✅ · ~~best-price card~~ ✅ · ~~admin analytics~~ ✅

### Done in the 2026-11-04/05 autonomous session (see AUTONOMOUS_WORKLOG.md)
- ~~/admin/coverage page~~ ✅ (was lost to a .gitignore bug, now fixed too)
- ~~Availability-only observations~~ ✅ ("not carried"/"out of stock" without
  invented prices, end to end: import → search → store page → ZIP pages)
- ~~Observation-level dispute UI~~ ✅ (flags on any history row, moderated)
- ~~Deal flags~~ ✅ (ended vs invalid) · ~~community deal reports~~ ✅
- ~~In-app price alerts~~ ✅ (watchlist notifications; no email — in-app only)
  + contributor resolution notices
- ~~Reliability tiers~~ ✅ · ~~price-history sparkline~~ ✅ ·
  ~~value-of-trip~~ ✅ · ~~two-store compare~~ ✅ · ~~nearby alternatives~~ ✅
- ~~Security pass~~ ✅ (report dedupe, OAuth linking, error hygiene, rate-limit
  cap) · ~~pluggable rate-limit storage~~ ✅ (RATE_LIMIT_BACKEND=db)
- ~~Import fuzz hardening~~ ✅ · ~~10k-store search benchmark + nearest-500
  correctness fix~~ ✅ · ~~duplicate-store scan~~ ✅ · ~~CSV price export~~ ✅
- ~~/how-it-works~~ ✅ · ~~profile credibility~~ ✅ · ~~account settings
  (password/display name/sign-out-everywhere)~~ ✅ · ~~comment editing~~ ✅
- ~~store-page SEO + JSON-LD + share~~ ✅ · ~~PWA manifest~~ ✅ ·
  ~~pilot-economics dashboard~~ ✅ · ~~audit-log viewer~~ ✅

## Now → pilot hardening
1. **Deploy on Replit** following REPLIT.md; set DEMO_MODE=false once real
   data lands; attach custom domain.
2. **Real Chicago data pass**: manual/community price collection for the 27
   directory stores to measure actual dispersion (business gate G1) before
   any calling spend. Use /admin/coverage demand to pick the next ZIPs.
3. **Email**: verification + password reset via a transactional provider;
   deliverability work (SPF/DKIM/DMARC — the notes' spam concern).
4. **Store hours/brand metadata** enrichment (OSM Overpass is free).
5. ~~Observation-level dispute UI~~ ✅ done (flags on price-history rows).

## Next
6. **Price alerts** — in-app alerts ✅ done; email delivery still open
   (needs the email provider from item 3).
7. **Flavor/strength availability reports** as structured community data
   (schema fields already exist on observations).
8. **Receipt photo evidence** (size/type-limited upload, EXIF stripping,
   moderation queue) feeding a higher-confidence verification tier.
9. **Anti-abuse v2**: IP/device clustering on corroborations, geo
   plausibility checks (confirming a Chicago store from another state),
   anomaly dashboards.
10. **Multi-brand**: seed On!/VELO/Rogue product lines; product switcher
    becomes a menu; importer already generic. Per-pouch price
    normalization for the 15→20-pouch can transition (research flag).
11. **Automated import handoff**: watched bucket / `POST /api/imports`
    with API key + batch status webhook (contract unchanged).

## Later / gated
12. **Outbound calling integration** — *separately authorized*; blocked on
    the legal gate (TCPA wireless consent, Illinois all-party consent) and
    business gates in BUSINESS_RESEARCH.md. Build order and costs in
    ELEVENLABS_CALLING_RESEARCH.md §roadmap: Trust Hub/STIR-SHAKEN setup,
    line-type scrubbing, consenting-number pilot, webhook receiver
    producing IMPORT_CONTRACT-shaped files.
13. **B2B price-intelligence exports** (the most plausible revenue line).
14. **Expansion**: Chicago suburbs → second metro, driven by the coverage
    and engagement KPIs in BUSINESS_RESEARCH.md; kill criteria respected.
15. SEO landing pages per neighborhood/ZIP (organic is the only viable
    acquisition channel given nicotine ad bans).
