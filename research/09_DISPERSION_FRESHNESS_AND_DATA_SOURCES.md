# 09 — Price Dispersion, Freshness, and Alternative Data Sources

**Prepared:** 2026-11-04/05 · Phase 7 memo. Labels: [V] [S] [S1] [A] [I] [M].

## Bottom line
1. **Dispersion across states is well established. Dispersion within Chicago is still unmeasured**, and it is the single number that decides go/no-go (gate G1). The evidence that a large within-market spread is plausible is indirect: Illinois's 45% tax was passed through unevenly (one Gold Coast shop at $9.92 after tax [S: Axios]); PouchBuddy's California receipts range $6.50–9.75 across just 11 reports (a ~50% spread within one state) [V]; and a price tracker reports ZYN 5-can packs ranging **$20.44–41.49 across 43 Costco warehouses** [S1], which mostly reflects state taxes. **No published study measures store-to-store ZYN dispersion within a US city** (the closest, *Addiction* 2025, compared ZYN to Marlboro within 716 California stores, not across stores) [S].
2. **Prices change rarely but in clusters.** Cigarette list prices historically rise two to four times a year [S: CSP/CStore News trade reporting], and pouch prices move at tax events, manufacturer list changes, promotions, and **now the 15→20 pouch can transition**. As of Oct 17, 2026, PMI had **not published a price for the 20-count regular can** [S1: Takeroon]. Both sizes will coexist on shelves, so **per-pouch normalization and a `can_size` field are mandatory** (the import contract already supports `can_size`).
3. **Freshness economics favor event-driven refresh:** monthly baseline confirmation plus immediate re-checks after tax changes, list-price changes, and user disputes. A 45–60 day freshness window with visible "last confirmed" dates is honest and adequate for a sticky-price product.
4. **The cheapest lawful data sources are not calls.** In order of cost per accurate price: store self-reporting (≈$0), community confirmations (≈$0, needs traffic), receipts (≈$0, needs users), human in-person sweeps ($2–5/price, the gold standard for validity), human calls (≈$1–2.50), AI calls (≈$0.45 base, with legal overhead and validity risk). Partner feeds from distributors or chains could beat all of these but take months to negotiate.

## 1. What determines local dispersion [I]
- **Store type:** smoke shops and tobacco-focused independents often price aggressively on pouches as a traffic driver. Pharmacies and airport or downtown news stands price high. Walgreens and Osco together hold ~133 of Chicago's 1,904 tobacco licenses (Phase 5).
- **Location rent and competition:** Loop/Gold Coast vs. neighborhood blocks.
- **Pass-through behavior after the July 2025 tax:** uneven pass-through is a one-time dispersion generator that may fade as stores converge over 12–24 months. **So Chicago's dispersion may be shrinking right now, and the window may be closing.** NYC's Sept 2026 tax creates a fresh one (Phase 6).
- **Deals:** multi-can pricing (e.g., 5 for $X) and loyalty discounts (chain apps) create register prices that differ from shelf prices.
- **Cross-border:** Indiana's ~$1.65/can lower tax (Phase 6) is a persistent structural gap.

**Test design (the manual pilot, Phase 5 §6.1):** record ZYN 6mg regular, single-can shelf price, can size, deal terms, and tax display across ~120 Lake View + Lincoln Park licensees, twice, two weeks apart. Compute p10/p50/p90 and the p90–p10 spread; the share of stores within $0.25 of the median; the second-visit change rate (a direct freshness measurement); and phone-vs-in-person agreement for a subsample. **Decision:** p90–p10 ≥ $1.50 passes G1. Below $1.00, the intra-city consumer proposition fails, and only the cross-border or B2B angle remains.

## 2. Freshness: how often prices change
| Driver | Typical frequency | Evidence |
|---|---|---|
| Manufacturer list-price changes (cigarettes) | 2–4 per year | [S: CSP Daily News, CStore News reports of 2nd/3rd annual increases] |
| State tax changes | Rare, announced in advance | [V: e.g., IL Jul 2025, WA/NE/OR Jan 2026, NY Sep 2026] |
| Pack-size transition (ZYN 15→20) | Once, but with months of overlap | [S1: Takeroon; Northerner announcement] |
| Store promotions / multi-can deals | Weekly to monthly, store-specific | [A] |

**Implication for collection cadence [I]:** a store's regular single-can price probably stays unchanged for roughly 2–6 months at a time, with step changes around known events. Calling or visiting every store weekly would mostly re-confirm unchanged prices. **Optimal policy:** (1) monthly light confirmation (community tap or store self-report, with a call or visit only where nothing arrived); (2) an **event sweep** within 7 days of any tax or list-price change; (3) an immediate re-check on a user dispute; (4) prices older than 60 days are greyed out and older than 120 days are hidden (consistent with the app's current 21/120-day states, with the stale threshold to be tuned from pilot data).

## 3. The 15 → 20 pouch transition (a product requirement, not a nuisance)
- PMI flagged the transition and its margin effect in its Q3 2026 results [V: PMI 8-K, via the business doc]. Retail price for the 20-count regular can is unannounced as of mid-October 2026 [S1].
- ZYN Ultra is already 20-count, at a lower list price per pouch ($0.235 vs. $0.299 in one retailer's list) [S1].
- **Product implications:** show **price per pouch** next to price per can; record `can_size` on every observation; never compare a 15-count price with a 20-count price without normalization; flag stores carrying both sizes. The import contract supports `can_size`. The calling script must ask "is that the 15 or the 20 count?" (Phase 4 §4, stage S4).

## 4. Alternative data sources, ranked

| Source | Cost/accurate price | Validity | Coverage | Legal exposure | Notes |
|---|---|---|---|---|---|
| **Store self-reporting** (verified owner profile) | ≈$0 + verification ops | Medium (self-interested; audit 10%) | Biased toward cheap stores | Minimal | Owner verifies via mail code to the licensed address or an inbound call. Best long-run engine. |
| **Community confirmations** (exists in app) | ≈$0 | Medium (corroboration rules) | Follows traffic | Minimal (Section 230 for user content) | Needs traffic NicFinder won't have early. |
| **Receipts** (user uploads; future) | ≈$0 + moderation | **High** (register price incl. tax/deals) | Follows users | Low (strip card data) | PouchBuddy shows receipt logging works, but slowly (56/yr nationally). |
| **In-person sweeps** (founder/helper) | $2–5 | **Highest** | Dense areas only | Minimal | The audit standard (Phase 4). |
| **Human phone calls** (identified, unrecorded) | $1–2.50 | Questionable (PHR 2009) | Broad | Low | Use for gaps; audit against in-person. |
| **AI calls** | ≈$0.45 base (+ counsel) | Questionable (PHR 2009) + ASR risk | Broad (business landlines only) | **Highest** (Phase 1) | Only after the gates. |
| **Distributor / chain partner feeds** | Low per price, high BD effort | High for that partner's stores | Partner footprint | Contractual | Approach after first B2B conversations. |
| **Delivery-app listings** (DoorDash/Uber Eats convenience) | Low | Biased upward (+15–30% markups) [repo calling doc]; nicotine often restricted on these platforms | Partial | **ToS/scraping risk** | Not recommended. |
| **Web scraping of store sites** | Low | Rarely available (c-stores don't post tobacco prices) | Very low | ToS risk | Not useful. |
| **State tobacco price surveys** (e.g., MA DPH annual survey; CA retail surveillance) | Free if published | High (methodical) | Sample-based, annual | None | Useful for calibration and B2B credibility, not live data. |

## 5. What would change this memo
- **Pilot shows p90–p10 < $1.00 in Lake View/Lincoln Park** → consumer thesis fails within the city. Pivot to the cross-border index plus B2B.
- **Second visit shows >20% of stores changed price within two weeks** → freshness costs are much higher than assumed. Favor receipts and self-reporting over sweeps.
- **PMI prices the 20-count can at parity with 15-count** → a large per-pouch price cut that will scramble shelf prices for months. That is a dispersion and traffic opportunity *if* NicFinder normalizes per pouch.

## Sources (accessed 2026-11-04/05)
- Axios Chicago on the IL tax and the $9.92 Gold Coast price: https://www.axios.com/local/chicago/2025/08/14/illinois-tobacco-tax-budget-2026-zyn-nicotine-products
- PouchBuddy price map (CA range): https://pouchbuddy.app/tools/nicotine-pouch-prices
- Costco ZYN price ranges across warehouses (tracker): https://app.warehouserunner.com/costco/1395875-zyn-citrus-3mg-5-15ct-cans
- *Addiction* (2025), ZYN vs. Marlboro price per mg in California retailers: https://www.citedrive.com/en/discovery/price-comparisons-for-the-leading-brands-of-oral-nicotine-pouches-and-cigarettes/ (DOI 10.1111/add.70569)
- Cigarette list-price frequency: https://cspdailynews.com/tobacco/altria-takes-third-price-increase-year ; https://csnews.com/philip-morris-usa-takes-third-price-increase-year
- ZYN can-size transition and 20-count price status: https://www.takeroon.com/blog/how-many-pouches-in-a-zyn-can ; https://www.northerner.com/us/the-northerner/news/coming-soon-more-zyn-pouches-per-can ; https://www.takeroon.com/blog/zyn-price-guide-how-much-do-zyns-cost
- PHR 2009 phone vs. in-store validity: https://pmc.ncbi.nlm.nih.gov/articles/PMC2693167/
- Massachusetts tobacco availability and pricing survey: https://www.mass.gov/doc/massachusetts-tobacco-availability-and-pricing-survey-fiscal-year-2024/download
