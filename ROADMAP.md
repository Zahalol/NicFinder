# Roadmap (post-MVP, prioritized)

## Now → pilot hardening
1. **Deploy** (Vercel/Fly + managed Postgres): swap datasource, PostGIS or
   earthdistance index for radius queries, Redis-backed rate limiting,
   real SESSION_SECRET/OAuth secrets, DEMO_MODE=false once real data lands.
2. **Real Chicago data pass**: manual/community price collection for the 27
   directory stores to measure actual dispersion (business gate G1) before
   any calling spend.
3. **Email**: verification + password reset via a transactional provider;
   deliverability work (SPF/DKIM/DMARC — the notes' spam concern).
4. **Store hours/brand metadata** enrichment (OSM Overpass is free).
5. **Observation-level dispute UI** on price history (today disputes target
   the current price only).

## Next
6. **Price alerts** (email, opt-in) and saved home store list.
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
