# 99 — Founder Decision Brief: NicFinder

**Date:** 2026-11-05 · Synthesizes `research/00`–`10`. Research only; **not legal, tax, or investment advice.**

## Verdict: **CONDITIONAL GO, as a low-cost, data-first side project. NO-GO on automated calling for now.**

The informational site is very likely lawful and cheap to run. The binding problems are **demand** and **monetization**, not data cost:
- A Chicago-only consumer site plateaus at roughly **1,000–4,000 monthly users**. The metro has about 160k pouch users; a GasBuddy-like 2.5% penetration is the optimistic case.
- Consumer revenue (affiliate, sponsorships, display) **cannot fund paid price collection** at any modeled scale in the base case.
- **The only line that makes this a business is B2B store-level price data**, and no one has paid for it yet.

So proceed only to the point where you can test the two facts that decide everything: **(1) is the within-Chicago price spread ≥$1.50/can, and (2) will someone pay ≥$500/month for verified shelf-price data?** Both can be tested in about 90 days for under ~$2k and without any automated calling.

**What would flip the verdict:**
- **To GO:** p90–p10 spread ≥$1.50, plus a paying B2B pilot.
- **To PIVOT** (cross-border index or B2B-only): spread <$1.50, but a B2B buyer appears or the Chicago–Indiana gap proves newsworthy.
- **To NO-GO:** spread <$1.00 and no B2B interest by month 6.

---

## Key findings by question

| Question | Answer | Confidence | Detail |
|---|---|---|---|
| **Top legal risks** | (1) AI-voice calls reaching wireless or mixed-use numbers ($500–1,500 per call, uncapped, possible **personal** liability). (2) Undisclosed or surreptitious transcription in Illinois (felony statute; civil actual + punitive damages). (3) Promotional content in calls turning them into telemarketing. (4) Undisclosed affiliate/sponsor ties and "verified" labels that aren't literally true. (5) Google-derived store data. | Medium-High | 01 §7 |
| **Is the site itself legal?** | Very likely yes. FDA Part 1140 binds manufacturers, distributors, and retailers, not a non-selling publisher. Stay out of transactions and manufacturer money. | Medium-High | 01 §1.1, §2 |
| **Entity** | **Single-member Illinois LLC** ($150 + $75/yr) before public launch or any contract. No Delaware until a priced round. S-corp only above ~$50–60k net profit. **The LLC does not shield you from calling violations you direct.** | Medium | 02 |
| **Best monetization path** | **B2B shelf-price panel** (monthly report + CSV, $500–1,500/mo; sell as a file or report, not a hosted dashboard, because of Chicago's 15% lease tax). Then retailer sponsorships (labeled, never altering neutral ranking). Affiliate (Nicokick/Northerner, both **Haypp Group**, ~5% and a 1-day cookie per aggregators) is pocket money and conflicts with the local-price mission. | Medium-Low | 03 |
| **Likely cost per accurate price** | AI calling: **≈$0.45 base (range $0.24–1.20)**, cost per *generated* price ≈$0.21. The repo's $0.90 overstated per-dial cost ~8×; its $0.20 omitted accuracy, QA, and fixed floors. **Biggest risk is validity:** a 2009 study found phone-collected cigarette prices invalid vs. in-store. Human calls ≈$1–2.50; in-person checks ≈$2–5 (the gold standard). | Medium-Low | 04 |
| **Launch-scale cost** | Chicago has **1,904 active tobacco licenses at 1,791 addresses** (City data). An AI-call sweep of all of Chicago plus inner suburbs ≈ **$1.2k one-time, ~$200/mo refresh**, excluding counsel, engineering, and founder time. A manual Lake View + Lincoln Park pilot (122 stores): ~40 hours or ~$600–800. | Medium | 05 |
| **Top expansion markets** | (1) **Chicago suburbs + NW Indiana** (IL 45% vs. IN ~$0.13/can). (2) **Minneapolis–St. Paul** (95%, WI border). (3) **NYC** (new 75% tax since Sept 1, 2026) or **St. Louis** (in-metro IL/MO border). College towns rank poorly. | Medium-Low | 06 |
| **Competition** | Thin: Nicotinly (Southeast, sparse), PouchBuddy (quit app; 56 US receipts/yr), modeled-price content sites. No dense verified dataset anywhere, which is both the opportunity and a warning about demand. | Medium | 08 |

## Major unresolved assumptions (ranked by impact)
1. **Within-Chicago price dispersion.** Unmeasured; decides gate G1. Possibly shrinking as stores converge after the July 2025 tax.
2. **B2B willingness to pay.** Every positive financial scenario depends on it.
3. **Validity of phone-reported prices** (if calling is ever used). Audit accuracy could be far below 90%.
4. **Demand penetration.** The 1–5% range of estimated pouch users is a guess anchored on GasBuddy.
5. **Share of store numbers that are wireless.** Determines how much automated calling is even possible.
6. **Whether 815 ILCS 305 (Illinois dialer law) reaches an interactive AI agent.** Counsel question.
7. **ZYN 20-count pricing and shelf mix.** Unannounced as of mid-October 2026.

## Questions for counsel (top 8; full lists in 01 §10 and 02 §11)
1. Does FCC 24-17 control in Seventh Circuit courts after *McLaughlin* (2025)? Assume an AI voice is "artificial"?
2. Confirm no TCPA consent requirement for non-telemarketing AI calls to *business landlines*. How should fixed VoIP, business wireless, and "unknown" lines be treated?
3. Does 815 ILCS 305 apply to an interactive AI agent? What are §30's penalties and private remedies?
4. Under 720 ILCS 5/14, does an up-front "automated, may be transcribed" disclosure plus continued participation defeat "surreptitious"? Is live ASR without retention still "transcribing"?
5. Founder personal exposure for directing a calling program; governance that reduces it.
6. Affiliate links into states with delivery-sale or flavor restrictions: is geofencing needed?
7. Review terms, privacy, correction/takedown policy, the "verified" definition, and "Sponsored" labels.
8. Chicago license class and fee for an internet-only home business (BACP), and whether any Chicago flavor or school-proximity rules affect how flavored pouches should be listed.

## Next ten highest-value decisions and validation experiments
1. **Run the manual dispersion pilot** (Lake View + Lincoln Park, 122 licensees, two sweeps two weeks apart). Measure p10/p50/p90, the 15- vs 20-count mix, and the change rate. *Decides G1.*
2. **Hold five B2B conversations** (a distributor, a chain category manager, a sell-side tobacco analyst, a public-health researcher, and Haypp or an online retailer) with the pilot panel in hand. **Ask for a price.** *Decides the business.*
3. **Form the Illinois LLC**, open a bank account, sign an IP assignment, and ask BACP about the license before public launch.
4. **Clean up store-data provenance:** rebuild the directory from the City license dataset plus OSM and store-sourced phone numbers. Remove anything copied from Google.
5. **Publish the "Chicago Pouch Price Index" and the "Chicago vs. Indiana gap" page** as the SEO and PR wedge. Measure Search Console impressions for 8 weeks.
6. **Launch retailer self-reporting** (verified store profiles, "store-reported" label). Target ≥5 claimed profiles in the pilot area.
7. **Add per-pouch normalization and `can_size` everywhere** before the 20-count cans hit shelves in volume.
8. **Decide whether to engage counsel on calling**, *only* if gates 1–2 pass and a B2B buyer needs coverage that manual and community methods can't deliver.
9. **If counsel clears it:** run the three-arm calling experiment (AI vs. human vs. in-person ground truth, ≤200 stores) with pre-set go criteria (04 §8).
10. **Month 6 checkpoint against the recalibrated kill criteria** (10 §4). Expand to the suburbs and NW Indiana only on a pass.

---

## One-page decision table

| **Do now** | **Do after legal review** | **Do after real pilot evidence** | **Do not do** |
|---|---|---|---|
| Form an Illinois LLC; EIN; bank account; IP assignment | Terms of use, privacy policy, correction/takedown policy, "verified" definition (1–3 hr lawyer review) | Fund collection beyond the pilot area (needs G1 spread ≥$1.50) | Automated or AI calls to any store **without** a written counsel opinion and your explicit authorization |
| Manual price collection (in person; human calls that identify NicFinder; no recording) | Affiliate links (with inline disclosure + state geofencing + merchant compliance warranty) | AI-calling experiment (needs counsel **and** demand/B2B gates) | Posing as a human or a customer; the "25-year-old guy" persona |
| 21+ gate (exists), dated provenance on every price, plain accuracy disclaimer | Retailer sponsorship contracts ("Sponsored" label standard) | Scale calling past ~200 stores (needs Phase 4 go criteria: ≥92% audit accuracy, ≤$0.75/accurate price, ≤2% opt-outs) | Any promotional content inside data-collection calls |
| Rebuild the store directory from City open data + OSM; drop Google-cached data | Any call recording or transcript retention policy | Minneapolis / NYC / St. Louis pilots (needs Chicago gates G1–G6 + a state-law memo) | Checkout, reservations, delivery coordination, NicFinder-issued nicotine coupons |
| SEO price-index and tax-explainer pages; Chicago-vs-Indiana content | Calling into Indiana or any non-Illinois state (state-specific memo) | Premium alerts / paid features (needs retention data) | Manufacturer-paid advertising or brand sponsorship |
| Five B2B buyer conversations | B2B data contracts (provenance clauses; Chicago lease-tax structuring with a CPA) | Delaware C-corp conversion (only at a priced round) | ZYN in the domain or logo; youth-appealing or college-party marketing |
| Retailer self-report profiles; per-pouch normalization | Insurance binding (cyber + media/E&O) before launch | Display ads on editorial pages (only at large scale) | Rotating or spoofing caller IDs; dialing faster to beat spam labels |

---

### Document map
[00 Register](00_SOURCE_AND_CONTRADICTION_REGISTER.md) · [01 Legal](01_LEGAL_COMPLIANCE_AND_FOUNDER_RISK.md) · [02 Structure](02_BUSINESS_STRUCTURE_AND_SETUP.md) · [03 Monetization](03_MONETIZATION_AND_EXIT_OPTIONS.md) · [04 Calling economics](04_ELEVENLABS_TWILIO_ACCURACY_AND_UNIT_ECONOMICS.md) ([CSV](04_calling_unit_economics_model.csv)) · [05 Chicago launch](05_CALL_SCALING_AND_CHICAGO_LAUNCH_PLAN.md) · [06 Expansion](06_CITY_EXPANSION_RANKING.md) · [07 Backlog](07_RESEARCH_BACKLOG_AND_PHASE7_INDEX.md) · [08 Demand](08_DEMAND_COMPETITORS_AND_ACQUISITION.md) · [09 Dispersion](09_DISPERSION_FRESHNESS_AND_DATA_SOURCES.md) · [10 Financials](10_FINANCIAL_SCENARIOS_AND_KILL_CRITERIA.md) · [Index](RESEARCH_INDEX.md) · [Log](RESEARCH_LOG.md)
