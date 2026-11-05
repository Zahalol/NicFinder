# NicFinder Research Index

Research-only due diligence (2026-11-04/05), produced on a separate session branch and merged into `main` on 2026-11-05. No application code was changed. Where these documents disagree with the older [`docs/BUSINESS_RESEARCH.md`](../docs/BUSINESS_RESEARCH.md) or [`docs/ELEVENLABS_CALLING_RESEARCH.md`](../docs/ELEVENLABS_CALLING_RESEARCH.md), **these win**; both older docs now carry a banner listing the differences. Start with [`99_FOUNDER_DECISION_BRIEF.md`](99_FOUNDER_DECISION_BRIEF.md).

| Phase | Document | Status | Key finding (one line) | Confidence |
|---|---|---|---|---|
| — | [00 Source & contradiction register](00_SOURCE_AND_CONTRADICTION_REGISTER.md) | Living | Prior "$10k/violation" eavesdropping claim not found in statute; IL 45% pouch tax verified from IDOR | — |
| 1 | [01 Legal compliance & founder risk](01_LEGAL_COMPLIANCE_AND_FOUNDER_RISK.md) | ✅ Done | The info site is very likely lawful; nearly all serious risk (incl. personal) is in automated AI-voice calling | Medium-High |
| 2 | [02 Business structure & setup](02_BUSINESS_STRUCTURE_AND_SETUP.md) | ✅ Done | Single-member Illinois LLC before public launch; no Delaware until a priced round; Chicago 15% lease tax matters for B2B database sales | Medium |
| 3 | [03 Monetization & exit options](03_MONETIZATION_AND_EXIT_OPTIONS.md) | ✅ Done | Consumer revenue can't fund paid collection in the base case at any scale; B2B data is required; Nicokick and Northerner are both Haypp Group | Medium-Low (revenue inputs mostly assumed) |
| 4 | [04 ElevenLabs/Twilio accuracy & unit economics](04_ELEVENLABS_TWILIO_ACCURACY_AND_UNIT_ECONOMICS.md) + [model CSV](04_calling_unit_economics_model.csv) | ✅ Done | ≈$0.45 per *accurate* price in the base case (range $0.24–1.20); $0.90 vs $0.20 reconciled; a 2009 study found phone-collected cigarette prices invalid, so audit accuracy is the key unknown | Medium-Low (funnel rates assumed) |
| 5 | [05 Call scaling & Chicago launch plan](05_CALL_SCALING_AND_CHICAGO_LAUNCH_PLAN.md) | ✅ Done | Chicago has 1,904 active tobacco licenses at 1,791 addresses (City data); throughput isn't the constraint (cadence, phone numbers, and law are); all-Chicago launch ≈$1.2k + ≈$200/mo | Medium |
| 6 | [06 City expansion ranking](06_CITY_EXPANSION_RANKING.md) | ✅ Done | Next: Chicago suburbs + NW Indiana (IL 45% vs IN ~$0.13/can), then Minneapolis (95%) and NYC (new 75% tax, Sept 2026); college towns rank poorly | Medium-Low (demand proxies coarse) |
| 7 | [07 Backlog](07_RESEARCH_BACKLOG_AND_PHASE7_INDEX.md) · [08 Demand & competitors](08_DEMAND_COMPETITORS_AND_ACQUISITION.md) · [09 Dispersion & data sources](09_DISPERSION_FRESHNESS_AND_DATA_SOURCES.md) · [10 Financials & kill criteria](10_FINANCIAL_SCENARIOS_AND_KILL_CRITERIA.md) | ✅ Done | Chicago consumer ceiling ≈1–4k monthly users (≈160k metro pouch users); new competitor PouchBuddy; manual collection beats calling financially; B2B carries every positive scenario | Medium-Low |
| — | [99 Founder decision brief](99_FOUNDER_DECISION_BRIEF.md) | ✅ Done | **Conditional GO** as a low-cost, data-first side project; **no-go on automated calling for now**; decided by a 90-day manual dispersion pilot + B2B willingness-to-pay test | Medium-Low |

## Open decisions for the founder
1. Whether to pursue automated calling at all, given that the risk is concentrated there (Phase 1 §7).
2. Clean up store-data provenance (Google vs. open data) before any B2B use (Phase 1 §5).
3. Ask Chicago BACP which license class (and 2026 fee) applies to an internet-only home business (Phase 2 §3).
4. Run five B2B buyer conversations before funding collection beyond the pilot (Phase 3 §5).
5. Any calling pilot must include an in-person ground-truth arm (Phase 4 §8).
6. Source phone numbers without Google Maps (the license dataset has none) (Phase 5 §3).

## Status
All seven phases and the founder brief are complete (2026-11-05). Per the founder's revised instruction, research stopped here rather than continuing open-ended cycles.
