# NicFinder — Business Research: ZYN Price Comparison, Chicago Pilot

> **Superseded in part — read [`research/99_FOUNDER_DECISION_BRIEF.md`](../research/99_FOUNDER_DECISION_BRIEF.md) first.**
> This was the first-pass business doc (2026-11-04). The deeper due diligence
> in [`research/`](../research/RESEARCH_INDEX.md) (2026-11-05) re-checked its
> claims; [`research/00_SOURCE_AND_CONTRADICTION_REGISTER.md`](../research/00_SOURCE_AND_CONTRADICTION_REGISTER.md)
> records each one. Where they disagree, **`research/` wins**. The main changes:
> - **Cost per price:** ~$0.90/price here overstated per-dial cost; research/04 estimates ≈$0.21 per *generated* price and ≈$0.45 per *accurate* one (range $0.24–1.20).
> - **Store universe:** ~1,904 Chicago tobacco licences at ~1,791 addresses (research/05), not ~1,200.
> - **Calling:** research/99 is **NO-GO on automated calling for now**; manual collection dominates in every modeled case (research/10). The "three gates pass → fund calling" rule in §8 is replaced by research/10's criteria.
> - **Kill gates:** the MAU thresholds here sit near the realistic ceiling (~1,150 MAU); research/10 replaces them with penetration + B2B revenue gates.
> - **Pilot:** a manual Lake View + Lincoln Park pilot (~122 stores, ~$600–800; research/05, 99), under ~$2k total over 90 days.
> - **Competitors:** not "exactly one" — research/08 adds PouchBuddy alongside Nicotinly.
> - **Ads/affiliates:** AdSense restricts rather than prohibits nicotine content; no Prilla affiliate program was found, and Nicokick and Northerner are the same group (research/03).
> - **Tax history:** pouches were previously outside the Illinois tobacco tax base; 15% was the vape rate (research/00 L11).

**Prepared:** 2026-11-04 (all web sources accessed this date unless noted)
**Scope:** Adult (21+) location-based price-comparison website for ZYN nicotine pouches. Information only — no sales, no checkout, no inventory. Pilot: Chicago (existing footprint: ~30 stores in Lincoln Park / Lakeview).
**Companion doc:** Detailed outbound-calling research (vendors, scripts, compliance, per-call costs) lives in `ELEVENLABS_CALLING_RESEARCH.md`. Section 4 here keeps only the summary economics.

---

## TL;DR

- **The concept is validated but barely contested.** Exactly one direct competitor exists: **Nicotinly (nicotinly.com)**, a "community-driven nicotine pouch price finder" covering ZYN/VELO/on!/Rogue/Lucy/Grizzly with purely user-reported prices, no described verification, no maps/alerts, and essentially zero press or search footprint. The category is open; it is also a signal that demand may be thin.
- **The spread is real and large — especially in Illinois.** MSRP is ~$5.64–5.69/can; typical shelf prices in low-tax states run ~$5.64–6.18. Illinois' July 2025 tax change (tobacco products tax to 45% of wholesale, nicotine pouches included for the first time) pushed observed Chicago-area prices to ~$8–10/can. Online benchmarks (Northerner, Nicokick, Prilla) run $3.49–4.49/can single, $2.79–3.99 bulk. Intra-city store-to-store dispersion of $1.50–3.00+/can is plausible and is the core value proposition. (Store-level dispersion within Chicago is an assumption until our own pilot data confirms it.)
- **The market is big and still growing:** US nicotine pouch retail sales ~$6.6B TTM (early 2026), +20% YoY; PMI shipped 3.2B ZYN pouches in Q3 2026 (+4.2% YoY) and is moving flagship cans from 15 to 20 pouches in Q4 2026 — which will scramble per-can price comparisons and makes **price-per-pouch normalization a day-one product requirement**.
- **The hardest problem is not data, it's demand + distribution.** Google Ads and Meta both prohibit nicotine-product promotion; an informational non-seller sits in a gray zone that in practice usually gets disapproved or banned. User acquisition is effectively organic/SEO/word-of-mouth only. Pouch prices are also sticky (unlike gas), so visit frequency will be low.
- **Go/no-go read: conditional GO** — but as a cheap, SEO-led validation experiment, not a funded data operation. Do not scale outbound calling until the Section 8 gates are hit. Biggest single risk to viability: **no paid acquisition channel + low natural visit frequency ⇒ possibly too little traffic to monetize anything**, regardless of data quality.

---

## 1. Competitive landscape

### 1.1 Nicotinly (nicotinly.com) — the only direct competitor found

Verified by direct fetch of the live site on 2026-11-04:

- **What it is:** self-described as "the community-driven nicotine pouch price finder" — "Compare prices at local stores for Zyn, Velo, on!, Rogue and more."
- **Coverage:** claims "across the US" with an "All 50 States" index, but only four state pages are featured (Georgia, Florida, North Carolina, South Carolina) — reads like a thin programmatic-SEO build seeded in the Southeast, not a dense dataset.
- **Brands:** dedicated pages for ZYN, VELO, on!, Rogue, Lucy, Grizzly.
- **Data source:** purely crowdsourced — users "report real prices they see on shelves." No verification process is described on the page.
- **Features absent:** no visible map UI, store locator, price alerts, accounts, freshness indicators, or data-quality signals.
- **Market presence:** a web search for "Nicotinly nicotine pouch price comparison" on 2026-11-04 returned **no third-party coverage of the site at all** — no press, no reviews, no Reddit chatter in results. Either very new or very low traction.

**Implications for NicFinder:**
- *Validates* that someone else independently reached the same thesis (crowdsourced pouch prices, state/brand SEO pages).
- *Warns* that pure crowdsourcing with no seed data yields empty pages; an empty price finder has no reason to be revisited, and no visitors means no contributions (cold-start death spiral).
- *Differentiation available:* verified/seeded data (our calling + in-person collection), freshness timestamps, per-pouch normalization, Chicago density instead of 50-state thinness.
- Worth monitoring quarterly; also check whether it has an age gate and a data-licensing play (none visible).

### 1.2 Gas-price apps — what to adopt, what to avoid

| App | Model | Adopt | Avoid |
|---|---|---|---|
| **GasBuddy** | Crowdsourced reports + points/prize-draw incentives; geolocation check on reporters; monetizes via ads and "Pay with GasBuddy" discount card | Points/recognition for reporters; geofenced submission; freshness timestamp on every price; station-page completeness (hours, amenities) | **Ad density** — the most common 1-star theme is "shoving in more and more ads… trashed an excellent app"; also points-chasing produces fake reports ("people report wrong prices just to try to win a gas card") — incentive design must reward *verified* accuracy, not volume |
| **Upside** | Pay-for-performance: merchants fund personalized cash-back offers; Upside takes a share of *incremental* profit it proves it generated | The merchant-funded, pay-only-on-proof revenue logic is the best template for "sponsored store listings" (Section 7); aligns store incentives with being listed | Requires receipt/transaction verification infrastructure we won't have at pilot scale; cash-back on an age-restricted product needs legal review before ever attempting |
| **Waze / Google Maps gas prices** | Prices as a *feature inside navigation*, sourced from data partners + user confirmation prompts ("is this price still right?") | Lightweight confirm/deny prompts (one tap) are the cheapest crowdsourcing primitive; prices embedded in an existing journey beat a destination app | We have no host app to embed in — this is exactly the distribution advantage we lack; don't copy the UI, copy the one-tap confirmation |
| **GasGuru** | OPIS wholesale-derived data + ads | Third-party/authoritative data seed (our calling program is the analog) | Reviewers: "more ads than gas prices now… a full-screen ad before it even shows the map" — the category's cautionary tale on monetizing before retention |
| **AAA (gasprices.aaa.com)** | OPIS-sourced daily averages, no UGC, free, trusted brand | Publishing **neighborhood/city average + range** is valuable even before store-level coverage is dense; being the citable "Chicago ZYN price index" earns links/SEO | Averages alone don't answer "where do I buy cheapest right now" — must not stop there |
| **FuelUp** (and similar small fuel apps) | Niche crowdsourced/regional | Evidence that sub-scale clones of GasBuddy don't retain users | Same fate awaits a thin pouch-price site — density in one geography beats breadth |

**Design conclusions:** (1) every displayed price must carry a visible "as of" date and source type (called / user-reported / verified); (2) one-tap confirm beats free-text entry; (3) keep the pilot UI ad-free — the entire category's reputation problem is ad load on top of stale data; (4) normalize to **price per pouch** (15 vs 20-pouch cans coexist in Q4 2026–2027).

### 1.3 Online retailers as price benchmarks (not direct competitors)

- **Northerner:** ZYN ~$4.49/can single, ~$3.99/can at 25-can bulk (Oct 2026 listings).
- **Nicokick / Prilla:** bulk ZYN typically <$0.25/pouch; historical cites $3.49 single / $2.79 bulk-50 vs $5.69 MSRP.
- These are useful as (a) a published floor price ("you're paying $X above the online price at this store"), (b) an affiliate possibility with heavy caveats (Section 7).
- **Key structural fact:** online runs ~30–40% below brick-and-mortar *before* Illinois' tax, and online sellers must still collect applicable taxes for IL delivery — verify how the 45% wholesale tax applies to remote sellers (counsel question). Brick-and-mortar remains dominant because pouches are an impulse/convenience purchase with age verification at the counter; "cheapest can within 5 minutes of me, right now" is a different job than "cheapest can in 3 shipping days."
- No other US nicotine-pouch *store-level* price trackers were found beyond Nicotinly; academic literature (e.g., Addiction, 2025, DOI 10.1111/add.70569) does brand-level price comparisons only.

---

## 2. Market context

### 2.1 ZYN size and growth (PMI reported figures)

From PMI's 2026 quarterly releases (SEC 8-K exhibits) and trade coverage:

- **Q3 2026:** US ZYN shipments **3.2B pouches, +4.2% YoY**; total US oral smoke-free 3.7B equivalent units (+2.3%). Growth decelerating vs. the prior year's +37% quarter (which had a promotional spike).
- **Q2 2026:** ZYN 2.9B pouches, +1.8%. **Q1 2026:** 2.3B pouches (~155M cans), **–23.5%** (inventory/comp effects).
- **Q4 2026 guidance:** broadly in line to modestly above Q3; PMI flagged "abnormally low" US Q4 profitability due to the **15→20 pouch can transition** (≈25% less revenue per pouch — a consumer value move under competitive pressure).
- **Category:** US nicotine pouch retail sales ≈ **$6.6B** in the 12 months through early March 2026, **+20% YoY** (Bloomberg via 2Firsts). Pouches were **59.9% of the oral tobacco category** in Q2 2026.
- **Share:** contested — recent Bloomberg tracking puts ZYN around **one-third of the market and declining** (Velo Plus ~10% and rising; Altria on! 14.4% retail share Q2 2026), while other 2026 coverage still cites ZYN at ~61.5% can-volume / 67%+ value share. Either way: ZYN is the anchor brand, but a pouch price site should track VELO/on!/Rogue too — competition is intensifying, which *increases* price dispersion and promo activity (good for us).
- **FDA:** first-ever pouch PMTA authorizations to 20 ZYN products (Jan 16, 2025); +11 ZYN ULTRA variants Aug 21, 2026 → 31 authorized variants.

**Takeaway:** large, growing, increasingly competitive category; the can-size transition makes per-pouch price normalization both a necessity and a differentiator (most consumers won't do the math).

### 2.2 Retail price range per can

- **MSRP:** $5.64–5.69 (sources differ slightly).
- **Low-tax states (sales tax only, ~30 states):** ~$5.64–6.18/can (modeled).
- **High-tax states (modeled/observed):** Illinois ~**$9.92 (observed, CSP Daily News via Takeroon)**; Vermont ~$9.28; Washington ~$9.12–12.05 (95%-of-selling-price tax eff. Jan 2026); Minnesota ~$9.00–10.55.
- **Online:** $3.49–4.49 single; $2.79–3.99 bulk.
- **Caveat:** most state-by-state figures are tax-formula models, not audited shelf prices; the Takeroon table (updated 2026-10-17) explicitly calls them "not receipts." That gap — *nobody actually knows shelf prices* — is precisely NicFinder's opportunity.

### 2.3 Illinois / Chicago / Cook County taxes (the engine of local dispersion)

- **Illinois (state), effective July 1, 2025:** Tobacco Products Tax raised **36% → 45% of wholesale price**, and **nicotine pouches/analogs were brought into the base for the first time** (previously taxed at a lower e-cig/analog rate or untaxed; sources conflict on the exact prior treatment — 15% is cited for "nicotine analog products"). Projected ~$53M new revenue. This is what moved Chicago ZYN from ~$8 to ~$10/can territory.
- **City of Chicago:** Chicago's 2016 "Other Tobacco Products" tax ($1.80/oz smokeless, etc.) was **struck down** — *Iwan Ries & Co. v. City of Chicago* (Ill. Sup. Ct. 2019): state law preempts municipal non-cigarette tobacco taxes not enacted before July 1, 1993. Chicago retains its **cigarette** tax and a **liquid nicotine (vape)** tax. **Best current reading: no Chicago city excise applies to nicotine pouches** — but this must be confirmed by counsel against the current Municipal Code, because the city has repeatedly tested the boundary.
- **Cook County:** has an OTP tax since 2012 (counties were *not* preempted). Last confirmed smokeless rate: **$0.60/oz** (county notices/floor-tax forms, 2013–2016). **Open legal question:** ZYN contains no tobacco leaf — whether tobacco-leaf-free pouches fall under the county's "smokeless tobacco" definition is unresolved in anything we found. A 0.56-oz can at $0.60/oz would add only ~$0.34 anyway. **Flag for counsel; do not state county tax treatment on the site until verified.**
- **Practical consequence:** Chicago vs. suburban Cook vs. collar counties (Lake, DuPage) vs. **Indiana border stores** can differ by several dollars per can once sales-tax deltas (Chicago combined sales tax 10.25%) and retailer pass-through choices stack. Pass-through is uneven — some stores absorbed part of the July 2025 hike, others over-shot it. **This unevenness is the product.**

### 2.4 Price dispersion as the core value proposition

- Gas apps work on ~$0.20–0.60/gal spreads (~3–8%). Plausible ZYN spreads in Chicago: **$7.50–$11+ per can (~30–45%)** between a discount tobacco shop and a downtown 7-Eleven. A 1-can/week user saving $2/can saves ~$100/yr; a tin-a-day user ~$700+/yr. The absolute and percentage savings story is *stronger than gas*.
- **Assumption to validate in week 1 of the pilot:** standard deviation of ZYN 6mg price across our ~30 Lincoln Park/Lakeview stores. If observed intra-neighborhood spread is < ~$1.00/can, the consumer proposition weakens sharply (and the thesis shifts to cross-neighborhood/suburb comparisons or B2B data).

---

## 3. Chicago pilot geography

### 3.1 Store universe (estimates — label: ASSUMPTIONS unless cited)

- **US baseline (NACS/NIQ TDLinx, stores open 2025-12-31):** 151,975 convenience stores nationally; 122,620 sell fuel. Chicago is ~0.8% of US population ⇒ naive scaling suggests ~1,200 c-stores in the city proper; metro (9.4M people) ~3,500–4,500. (ASSUMPTION — directory counts like poidata.io's "4,338 c-stores in Illinois / 273 in Chicago" are unreliable undercounts.)
- **Better source, to pull next:** Chicago Data Portal → active business licenses, activity code **763 "Retail Sale of Tobacco"** (city license is mandatory for any tobacco/e-cig retail; $500/location + $330/register historically). This gives the *exact* licensed-tobacco-retailer universe for the city — likely in the 1,500–3,000 range including liquor stores, smoke shops, groceries. (ASSUMPTION pending the pull; this should be done before any further spend.)
- Note: Chicago's Feb 2023 distance restrictions limit *new* vape/tobacco-store licenses — the retailer universe is roughly static, which helps data maintenance.

### 3.2 Pilot and expansion sequence

1. **Phase 0 (now):** Lincoln Park / Lakeview, ~30 stores — dense, walkable, young-professional ZYN demographic, DePaul-adjacent (mind the 21+ framing). Goal: prove dispersion + freshness + any organic demand.
2. **Phase 1:** contiguous North Side band (Wicker Park/Bucktown, Logan Square, Old Town, River North, Loop) → ~150–250 stores. The Loop adds the "office worker buying at a premium" contrast story.
3. **Phase 2:** full city (~1,500–2,500 licensed tobacco retailers) + the high-value *tax-arbitrage edges*: Evanston, Oak Park, and especially **NW Indiana border stores** (Hammond/Whiting) where spreads vs. downtown should be maximal and the content writes itself.
4. **Phase 3:** replicate in one other high-tax metro where the spread story is strong (Seattle post-95% tax, Minneapolis, NYC) — only after Chicago hits Section 8 gates.

### 3.3 Density economics

- Value to a user ≈ coverage within *their* 5–10 minute radius. 30 stores in two neighborhoods ≫ 300 stores scattered citywide. Expand as contiguous ink-blot, never as scatter.
- Per-store data maintenance (Section 4) is ~$1–3/store/month via calling. A 250-store Phase 1 is ~$250–750/mo to keep fresh — cheap enough to run on founder budget; 10,000 stores is a ~$10–30k/mo commitment that must be revenue-justified.

---

## 4. Data acquisition economics (summary — details in `ELEVENLABS_CALLING_RESEARCH.md`)

### 4.1 Editable assumptions (change these, the table recomputes)

| Assumption | Value | Basis |
|---|---|---|
| A1. Cost per dial attempt (AI voice + telephony) | $0.35 | ~3.5 min avg handled call × ~$0.10/min blended (agent + telco); failed/short calls cheaper, blended here |
| A2. Answer rate (store picks up) | 65% | Retail stores answer more than consumers; daytime calls |
| A3. Price obtained per answered call | 60% | Clerk willing + able to read shelf price; some refuse/"manager only" |
| A4. Net success per dial (A2×A3) | ~39% | ⇒ ~2.6 dials per fresh price |
| A5. Cost per *successful* price point | ≈ $0.90 | A1 × (1/A4) |
| A6. Refresh cadence | every 3 weeks | Pouch prices are sticky; tax events trigger extra sweeps |
| A7. SKUs per call | 3–5 (ZYN 3/6mg + 1–2 competitors) | Marginal SKU ≈ free within same call |

### 4.2 Monthly cost model at scale tiers

| Stores | Successful refreshes/mo (A6 ⇒ ~1.45×stores) | Dials/mo (÷A4) | Cost/mo (×A1) | Cost/store/mo | Annual |
|---|---|---|---|---|---|
| 100 | ~145 | ~372 | **~$130** | $1.30 | ~$1.6k |
| 1,000 | ~1,450 | ~3,720 | **~$1,300** | $1.30 | ~$15.6k |
| 10,000 | ~14,500 | ~37,200 | **~$13,000** | $1.30 | ~$156k |

Sensitivity: if refusal rates are worse (A3 = 40%) cost/store/mo ≈ $1.95; if ElevenLabs minutes land at the high end, double everything. Even pessimistically, **data cost is not the binding constraint below ~1,000 stores** — demand is. Note also: repeated robocalling of the same stores risks burn-out/complaints; rotate scripts, cap frequency, honor "stop calling" — see companion doc for TCPA/robocall analysis (B2B informational calls are lower-risk than consumer robocalls but not risk-free).

### 4.3 Crowdsourcing viability

- GasBuddy's lesson: crowdsourcing works at *high visit frequency* (daily fueling) and still suffers accuracy rot and points-gaming. Pouch purchase frequency (every few days to weekly) is lower; expect contribution rates of **<1–3% of active users** (ASSUMPTION; gas apps see low single digits).
- Realistic pilot role for crowdsourcing: **confirm/deny prompts and shelf-photo uploads that *supplement* called data**, not primary sourcing. Primary crowdsourcing is only viable at a traffic scale we won't see for a long time — this is Nicotinly's structural flaw.

### 4.4 Freshness requirements

- Pouch prices change on: tax events (step changes, known dates), chain-wide repricing, promos (multi-can deals), and the 15→20 pouch transition (Q4 2026 — treat as a *new SKU*, not a price change).
- Target: every displayed price **≤ 21 days old**, badge "verified by call" vs "user-reported"; anything >45 days gets greyed out. A stale wrong price destroys trust faster than a missing one (GasBuddy's core complaint).

---

## 5. Trust and abuse

- **Consumer trust:** crowdsourced-price skepticism is well documented (GasBuddy reviews: "all of the actual prices were drastically higher than reported"). Countermeasures: provenance labels, timestamps, called-and-verified badge, show last-verified date prominently, never show a price without a date.
- **Store participation incentives:** cheap stores *want* to be listed (Upside logic — it drives provable foot traffic); expensive stores may demand removal. Policy decision needed day 1: we list factual, lawfully obtained price observations and do not remove accurate data on request (publishing truthful price info is protected speech; still get counsel's blessing on the takedown policy).
- **Abuse vectors:**
  - *Competitor sabotage:* store A reports fake high prices for store B. Mitigate: geofenced submissions, per-account rate limits, outlier detection vs. called baseline, require photo for large deltas.
  - *Brand/manufacturer astroturfing:* less about prices, more about reviews/flavor content — keep the site price-only to minimize the surface.
  - *Points-gaming:* if we add contributor rewards, reward **verified accuracy** (report later confirmed by call/photo), never raw volume.
- **Accuracy limits to disclose:** shelf price ≠ register price (discounts, loyalty, multi-can deals), taxes included vs. not, and clerk-quoted prices can be wrong. Publish a plain-language accuracy disclaimer; display prices as "as observed on [date]."

---

## 6. Regulatory and marketing constraints

**What NicFinder is:** an informational price-comparison publisher. It does not sell, ship, process payment for, or advertise on behalf of nicotine products.

### 6.1 What clearly applies
- **Age-gating norms:** FDA's ZYN authorization is expressly 21+, with PMI committed to 21+ ad audiences and 35+ models. Industry norm for nicotine-adjacent informational sites (brand sites, Northerner, etc.) is a 21+ age gate / age-affirmation interstitial. **Adopt a 21+ gate from day 1** — legally conservative, cheap, and signals good faith to platforms, AGs, and app stores.
- **Platform ad bans (the big one):** Google Ads prohibits ads for tobacco and nicotine products; Meta prohibits ads "promoting the sale or use of tobacco or nicotine products," and nicotine pouches are explicitly listed. An info-only site arguably isn't "promoting sale," but in practice platform enforcement lumps nicotine-adjacent content in; expect disapprovals and account risk. **Plan for $0 paid social/search acquisition.** (Niche/programmatic networks that accept nicotine-adjacent are low quality; avoid at pilot.)
- **App stores:** Apple/Google impose 17+/restrictions on tobacco-related apps — another reason to stay web-first.

### 6.2 What does *not* directly apply (but shapes the climate)
- FDA PMTA marketing restrictions bind **PMI**, not independent publishers. We make no therapeutic/reduced-risk claims, run no manufacturer advertising, and should keep it that way: accepting *manufacturer* money would import that entire regime (Section 7).
- State/Chicago tobacco retail licensing applies to **sellers**; we are not one.

### 6.3 Watch items / counsel questions
- **State AG sensitivity:** tobacco/nicotine marketing reaching minors is a perennial AG target (vape-era precedents). Mitigations: age gate, no flavors-glamorizing content, no "deals for teens"-adjacent SEO, no cartoonish branding. Get a one-time counsel review of site copy and the age gate.
- **Counsel checklist:** (1) Cook County OTP ordinance applicability to leaf-free pouches; (2) confirmation no Chicago city tax applies post-*Iwan Ries*; (3) takedown/accuracy policy for store price listings; (4) TCPA/IL telemarketing analysis for AI calls to businesses (companion doc); (5) affiliate relationships with online nicotine retailers — permissibility and required disclosures; (6) whether displaying "buy online cheaper" links to out-of-state sellers creates any IL facilitation exposure.
- **Honest framing:** nothing we found prohibits an age-gated informational price site. The constraint is not legality; it's that the *distribution rails* (paid ads, app stores, possibly some SEO features) treat the whole category as radioactive.

---

## 7. Revenue models — honest assessment

| Model | Mechanics | Viability |
|---|---|---|
| **B2B price intelligence** | Sell store-level street-price panels (Chicago first) to distributors, retailers, analysts, hedge funds covering PM/MO/BTI. Nobody has shelf-level pouch pricing — even the best public "price by state" tables are tax models, not observations. | **Most promising.** One metro's verified panel could be worth more than years of consumer ads. Doesn't depend on consumer traffic at all. Conflicts to manage: selling data to manufacturers while claiming consumer neutrality. |
| **Sponsored store listings (retailers, never manufacturers)** | Tobacco shop pays for highlighted placement / "verified price daily" badge; Upside-style only-pay-for-results variants later. | Viable at modest scale; needs real traffic first. Clearly label sponsorship. Manufacturer money = regulatory contamination; refuse. |
| **Affiliate to online retailers (Northerner/Nicokick/Prilla)** | "Cheapest online: $4.49" link with affiliate tag. These programs exist. | **Thin and fragile.** Undercuts the local-store proposition, likely annoys B2B retail customers, and nicotine affiliate programs face payment-processor and platform churn. Do NOT build the model on this; treat as pocket change if counsel clears it. |
| **Premium consumer features** | Price alerts, multi-brand tracking, historical charts. | Weak as paywall at pilot scale (low frequency product); fine as a later retention layer. |
| **Display ads** | AdSense-style. | Near-worthless and brand-damaging (GasBuddy/GasGuru lesson); nicotine-adjacent content also gets poor ad fill. Skip. |

**Assumption check the user asked for:** correct — tobacco/nicotine affiliate and ad inventory is NOT freely available; the monetization plan must work without open ad markets. The realistic stack is **B2B data first, retailer sponsorships second, consumer monetization a distant third.**

---

## 8. Experiments, KPIs, and kill criteria (before funding outbound calling at scale)

### 8.1 Cheap experiments (next 60–90 days, <$500 total)
1. **Dispersion audit (week 1):** publish min/median/max ZYN 6mg price across the existing ~30 stores. *This single number decides everything.*
2. **SEO demand probe:** launch 10–20 programmatic pages ("ZYN price in Lincoln Park", "Why ZYN costs $10 in Chicago — the tax explained", "Chicago vs Indiana ZYN prices"). Measure Search Console impressions/clicks over 8 weeks. No reliable keyword-volume data exists publicly for "zyn price near me" (our searches found none; "zyn nicotine pouches" topic ≈ 6.7k/mo per Exploding Topics) — Search Console reality beats keyword tools here. The tax-explainer content has genuine news value and link potential.
3. **Reddit/organic probe:** post the dispersion findings to r/Chicago, r/Snus etc. (within sub rules); measure referral traffic and sentiment. Zero cost, high signal.
4. **Confirmation-loop test:** add one-tap "still this price?" to store pages; measure contribution per 100 sessions.
5. **B2B smoke test:** 5 cold conversations with a distributor, a chain category manager, and a sell-side tobacco analyst, showing the 30-store panel. Ask for a price, not an opinion.

### 8.2 Gates to pass BEFORE scaling calling beyond ~250 stores

| # | Gate | Threshold (ASSUMPTIONS — set now, don't move later) |
|---|---|---|
| G1 | Observed intra-pilot price spread (ZYN 6mg) | ≥ $1.50 between p10 and p90 store |
| G2 | Organic search impressions (8 wks post-index) | ≥ 5,000/mo trending up; CTR ≥ 2% |
| G3 | Engagement | ≥ 500 MAU organic; ≥ 25% 30-day return rate among users with a saved neighborhood |
| G4 | Contribution | ≥ 2 confirmations per 100 sessions |
| G5 | Coverage freshness sustainable | ≥ 80% of listed stores with price ≤ 21 days old at ≤ $2/store/mo all-in |
| G6 | B2B signal | ≥ 1 party expresses willingness to pay ≥ $500/mo for the metro panel |

**Decision rule:** G1 fails → kill or pivot to pure B2B/tax-journalism data product. G2+G3 fail but G6 passes → pivot to B2B-only (no consumer site, calling is the product). Three or more gates pass → fund Phase 1–2 calling. **Kill criterion, hard:** if after 6 months and full-city coverage, MAU < 2,000 and B2B revenue = $0, stop — the demand does not exist at viable scale.

---

## 9. Biggest risks to viability (ranked, honest)

1. **Demand/distribution (existential):** no Google/Meta paid channel, low purchase-frequency product, unproven search demand for local pouch prices. Nicotinly's zero footprint may be evidence of the market's verdict, not just poor execution. *Mitigant:* Illinois' tax shock is a genuine, newsworthy consumer-pain moment — the one organic tailwind; exploit it now, it decays.
2. **Engagement frequency (structural):** pouch prices are sticky; the rational user checks once, memorizes the cheap store, and never returns. A price *site* may be a feature, not a company. *Mitigant:* alerts on changes/promos; B2B model is immune to this.
3. **Data trust cold-start:** small coverage + any stale/wrong price kills credibility (gas-app lesson). *Mitigant:* called-and-verified badges, dates on everything, small-but-perfect footprint.
4. **Platform/regulatory climate drift:** an AG inquiry, app-store rejection, or search-quality update that suppresses nicotine-adjacent sites could remove remaining channels. *Mitigant:* age gate, clean content, counsel review; keep B2B channel independent of consumer web.
5. **Pack-size transition confusion (near-term, Q4 2026–2027):** 15 vs 20-pouch cans at different prices will make naive per-can comparisons wrong. *Mitigant:* per-pouch normalization — also our clearest UX differentiation.
6. **Economics misread:** data cost is NOT the risk (≈$1.30/store/mo); the risk is spending on data nobody queries. Hence Section 8's demand-first gating.

**Overall read: conditional GO.** The information asymmetry is real (nobody has shelf-level pouch prices, and Illinois' tax makes Chicago the best market in America to prove it), the data cost is trivially low at pilot scale, and the only direct competitor is negligible. But proceed as a <$500, 90-day demand experiment with pre-committed kill criteria — the binding constraint is whether anyone searches for this, and that is testable cheaply before any calling spend.

---

## Sources (all accessed 2026-11-04)

**Competitor / apps**
- Nicotinly homepage (direct fetch): https://nicotinly.com/
- GasBuddy crowdsourcing model & points: Harvard D3 platform case — https://d3.harvard.edu/platform-digit/submission/gasbuddy-a-platform-for-crowdsourced-gas-price-data/
- GasBuddy/GasGuru ad & accuracy complaints: Trustpilot GasBuddy reviews — https://www.trustpilot.com/review/gasbuddy.com ; gas-app 1-star comparison (2026) — https://unstar.app/blog/gasbuddy-upside-checkout51-gas-guru-waze-gas-savings-apps-ranked-2026
- Upside revenue model: https://www.upside.com/blog/how-does-upside-make-money ; founder interview — https://technical.ly/startups/upside-wayne-lin/
- Online price benchmarks: Northerner ZYN listings — https://www.northerner.com/us/zyn-6mg-citrus-mini-strong-nicotine-pouches ; Tobacco Insider "How much are Zyns?" — https://tobaccoinsider.com/how-much-are-zyns/ ; Takeroon per-pouch comparison — https://www.takeroon.com/blog/cheapest-nicotine-pouches-per-pouch

**Market / pricing**
- PMI Q3 2026 earnings release (8-K ex-99.1, ZYN +4.2% to 3.2B pouches; 20-pouch can transition): https://www.sec.gov/Archives/edgar/data/0001413329/000162828026066596/earningsreleasepm-ex991xq3.htm
- PMI Q2 2026 (ZYN +1.8%, 2.9B): https://www.sec.gov/Archives/edgar/data/0001413329/000162828026049107/earningsreleasepm-ex991xq2.htm ; Q1 2026 (–23.5%, 2.3B / 155M cans): https://www.sec.gov/Archives/edgar/data/0001413329/000162828026026385/earningsreleasepm-ex991xq1.htm
- NACS summary of PMI quarter: https://www.convenience.org/stay-current/news/2026/october/26/pmi-sees-another-strong-quarter-from-smokeless
- US pouch market ~$6.6B TTM +20%, ZYN share ~1/3, Velo Plus ~10% (Bloomberg via 2Firsts): https://www.2firsts.com/news/bloomberg-zyns-dry-mouth-problem-threatens-its-hold-on-nicotine-pouch-market
- ZYN price by state table (modeled; IL $9.92 observed; updated 2026-10-17): https://www.takeroon.com/blog/zyn-price-by-state ; see also https://worldpopulationreview.com/state-rankings/zyn-price-by-state

**Illinois / Chicago / Cook County tax**
- Illinois 2026 budget: tobacco tax 36%→45%, pouches included (Axios Chicago, 2025-08-14): https://www.axios.com/local/chicago/2025/08/14/illinois-tobacco-tax-budget-2026-zyn-nicotine-products
- CBS Chicago on July 1, 2025 effective date: https://www.cbsnews.com/chicago/news/illinois-tax-hike-tobacco-vape-products ; CSP Daily News: https://www.cspdailynews.com/tobacco/illinois-start-taxing-nicotine-pouches-tuesday-under-amended-bill
- *Iwan Ries & Co. v. City of Chicago* (Ill. 2019), city OTP tax struck down: https://law.justia.com/cases/illinois/supreme-court/2019/124469.html ; Civic Federation background: https://www.civicfed.org/civic-federation/blog/chicagos-tax-other-tobacco-products-struck-down-cook-county-circuit-court
- Cook County smokeless $0.60/oz (county notice; last confirmed 2013–2016 docs): https://www.cookcountyil.gov/sites/g/files/ywwepo161/files/service/noticeofthecookcountytobaccoordinancechanges.pdf ; current page: https://www.cookcountyil.gov/service/tobacco-tax

**Regulatory / marketing**
- FDA ZYN authorization press release (2025-01-16; 21+, marketing restrictions): https://www.fda.gov/news-events/press-announcements/fda-authorizes-marketing-20-zyn-nicotine-pouch-products-after-extensive-scientific-review
- Google Ads dangerous products policy (tobacco prohibited): https://support.google.com/adspolicy/answer/6014299
- Meta ad standards — tobacco & nicotine (pouches listed): https://transparency.meta.com/policies/ad-standards/restricted-goods-services/tobacco-related-products/

**Geography / demand**
- NACS/NIQ TDLinx 2026 US store count (151,975; 122,620 w/ fuel): https://chainstoreage.com/total-us-c-store-count-dips-2025-texas-leads-top-10-states-store-count ; https://csnews.com/number-us-convenience-stores-selling-gas-ticks
- Chicago tobacco licensing requirement & fees: https://www.chicago.gov/city/en/sites/chicago-business-licensing/home/tobacco.html
- Illinois store directory counts (rough): https://poidata.io/index.php/report/convenience-store/united-states/illinois ; chain counts: https://www.scrapehero.com/location-reports/top-convenience-stores-in-illinois-usa/
- Search-demand proxies: https://explodingtopics.com/topic/zyn-nicotine-pouches-fT4DpZDr ; brand trends via 2Firsts: https://www.2firsts.com/news/nicotine-pouches-become-new-favorite-in-us-market-who-is-leading-the-attention

*Known gaps flagged in text: current Cook County ordinance text vs. leaf-free pouches; exact Chicago tobacco-license count (pull from Chicago Data Portal, code 763); verified keyword volumes (use Search Console); store-level dispersion (measure ourselves).*
