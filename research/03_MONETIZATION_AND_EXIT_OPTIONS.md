# 03 — Monetization, Affiliates, Advertising, and Strategic Buyers

**Prepared:** 2026-11-04 · **Phase 3 of 7** · Research only. Labels: **[V]** primary or official · **[S]** secondary · **[S1]** single secondary or aggregator · **[A]** editable assumption · **[I]** inference · **[Sp]** speculation.
**Builds on:** `docs/BUSINESS_RESEARCH.md` §7 (which ranked B2B data first, sponsorships second, consumer revenue a distant third). This phase tests that ranking with verified platform rules and explicit numbers. Legal constraints come from `01_LEGAL…` §1.6.

---

## Bottom line

1. **Consumer-side revenue alone (display ads + affiliate + sponsorships) does not cover the cost of keeping prices fresh in the base case at any traffic level we modeled, up to 500k monthly users.** In the base case at 100k users it brings in about $4.9k/month against about $6.5k/month of data and fixed costs. Only the *high* case breaks even on consumer revenue. **If B2B data revenue never appears, the business is a hobby or must cut collection to near-zero marginal cost (community-only data).**
2. **B2B price intelligence is the only line whose value doesn't depend on consumer traffic.** But it is unproven. **No published price exists for store-level pouch price panels. Syndicated tobacco data comes from scanner and shipment vendors (NielsenIQ, Circana, Management Science Associates) and has known coverage gaps in independent and specialist channels [S: PMC review].** That gap is the opportunity, and it needs a paying-customer test, not more research.
3. **The repo's advertising analysis conflated two Google systems (register D2).** *Google Ads* (buying ads) prohibits promoting tobacco products [V]. *Google Publisher Policies/AdSense* (showing ads) treats tobacco-*sale* content as **restricted, not prohibited**. Such pages get "restricted ad serving" (fewer advertisers), and Google's examples say *educational* tobacco content can carry unrestricted ads [V: Google Publisher Restrictions help page]. A price-comparison page sits between those examples. Expect restricted serving, low fill, and low RPM, but not a ban.
4. **Nicokick and Northerner are the same company: both are owned by Haypp Group** (Swedish-listed, ~SEK 3.85bn 2025 net sales) [V: Haypp annual report 2025; Tobacco Reporter]. An affiliate program for Nicokick is listed on aggregators at **5% per sale with a 1-day cookie** (via CJ) [S1: Lasso], and for Northerner at **5–10%** [S1: Shopper.com]. **Neither figure was confirmed with the merchant.** A 1-day cookie and 5% commission on a ~$60–130 order make affiliate revenue small.
5. **The strategic tension is real.** If online pouches cost $3.50–4.50/can versus $8–10 in Chicago stores, a prominent "buy online" link would convert *and* would turn NicFinder into an online-retail lead generator, undermining retailer sponsorships and B2B relationships. Keep it in a labeled, separate module (§6).
6. **Most plausible exit:** a small asset sale to a data company or online retailer (most plausibly Haypp, because of the fit), *if* NicFinder holds a unique, multi-metro, audited shelf-price dataset. **There is no evidence that Haypp or anyone else wants to acquire NicFinder [I].** Treat an exit as an option, not a plan.

---

## 1. Ranked monetization models

Scores 1–5 (5 = best). "Traffic required" is scored inversely (5 = needs little traffic).

| Rank | Model | Feasibility | Gross margin | Legal/platform risk (5=low) | Traffic required (5=little) | Defensibility | User trust | **Total /30** |
|---|---|---|---|---|---|---|---|---|
| 1 | **B2B price intelligence** (reports, panels, API) | 3 | 4 (data cost is the COGS) | 4 | **5** | 4 (an audited longitudinal panel is hard to copy) | 4 (if labeled and consumer data is unaffected) | **24** |
| 2 | **Retailer sponsorships** (labeled featured placement, "price updated daily" badge) | 3 | 5 | 4 | 2 | 3 | 3 (OK if labeled and ranking stays neutral) | **20** |
| 3 | **Retailer self-reporting subscription** (store pays a small fee for a verified profile and to post deals) | 2 | 5 | 4 | 2 | 3 | 3 | **19** |
| 4 | **Affiliate links to online retailers** | 4 | 5 | 3 | 2 | 1 | 2 (conflicts with "local cheapest") | **17** |
| 5 | **Premium consumer** (alerts, history) | 2 | 5 | 5 | 1 | 2 | 4 | **19** → realistically low (see §5) |
| 6 | **Display advertising** | 3 | 5 | 2 (restricted serving; network rejections) | 1 | 1 | 1 (gas-app 1-star lesson) | **13** |
| — | **Manufacturer advertising / brand sponsorship** | 2 | 5 | **1** | 2 | 1 | 1 | **12. Do not do (Phase 1 R13).** |

## 2. Display advertising, verified

**Google: two systems, two sets of rules**
- **Google Ads (advertiser side):** ads for tobacco or "any products containing tobacco" are not allowed, and products or services that "directly facilitate or promote tobacco consumption" are also covered [V: Google Ads Dangerous products policy, support.google.com/adspolicy/answer/6014299]. Nicotine pouches are not named in Google's page; Yahoo's ad policy names them explicitly [V: Yahoo ad specs]. **Implication:** NicFinder cannot reliably *buy* Google search ads promoting "find cheap ZYN"; an informational ad might pass and might get the account suspended. **Plan for $0 paid Google acquisition** (unchanged from the business doc).
- **Google Publisher Policies/Restrictions (publisher side):** tobacco content that promotes tobacco sales is a **Publisher Restriction**. It "does not violate policy," but receives **restricted ad serving** and "will likely receive less advertising." Google's illustration contrasts online *sale* pages (restricted) with *educational* tobacco material (ads can appear unrestricted) [V: support.google.com/publisherpolicies/answer/10437539; support.google.com/adsense/answer/10437795]. The rules apply across AdSense, AdMob, and Ad Manager, including direct deals served through Ad Manager [V].
- **Where NicFinder falls [I]:** store pages listing ZYN prices and "cheapest near you" are closer to *promoting sales* than to education. Tax-explainer articles ("why ZYN costs $10 in Chicago") are closer to education. **Expect restricted serving on price pages and possibly normal serving on editorial pages.** Account-level risk is lower than on the advertiser side, because restricted content is allowed.

**Other networks:** premium managed networks (Mediavine, Raptive) have traffic minimums and brand-safety policies; their tobacco stance was **not verified** [?]. Meta, Microsoft Advertising, and AppLovin prohibit nicotine *ads* [V: their policy pages via search], which says nothing about *showing* ads on a nicotine-adjacent site, but it shrinks the advertiser pool that would bid on it. SSPs such as PubMatic and Verve use tiered "restricted content" categories [S].

**Realistic economics [A]:** effective RPM on restricted pages of $0.50–3.00 per 1,000 pageviews, at 40–80% fill. At 10k users × 2.5 pageviews, that is **≈$20/month base case**. Not worth the trust cost before roughly 100k users. **Recommendation: no display ads in the pilot.** Revisit only for editorial pages at scale.

**Direct-sold inventory:** a local tobacco shop or c-store chain buying a banner is effectively a *sponsorship* (§3), which is better handled in the sponsorship model with labeling.

## 3. Affiliate relationships, verified as far as possible

| Merchant | Owner | Program evidence | Stated commission / cookie | Notes |
|---|---|---|---|---|
| **Nicokick** ("Nikko Kick") | **Haypp Group** [V] | Listed on CJ via the Lasso directory [S1] | **5% per sale; 1-day cookie** [S1] | Haypp says it sells 300+ pouch products in the US; ZYN returned to Haypp's US online portfolio in Sept 2025 and ZYN ULTRA launched there in June 2026 [V: Haypp/BusinessWire]. |
| **Northerner** | **Haypp Group** [V] | Shopper.com listing [S1] | **5–10%**; returns reverse commissions [S1] | Same parent as Nicokick, so these are effectively one partner. |
| **Prilla** | Prilla, Inc. | **No affiliate program found**; only a customer rewards program [S] | — | Contact directly if needed. |
| Others (e.g., WhitePouches; brand DTC sites) | various | FlexOffers lists a WhitePouches program [S1] | not verified | Lower-tier; check ship-to restrictions. |

**Never quote these commission rates publicly or rely on them until the merchant confirms them in writing.**

**Constraints to expect [I/S]:** the merchant handles age verification and refuses shipping to restricted states (Haypp press releases mention "verified adult consumers" and state-by-state resumption, e.g., Alabama). Affiliate terms typically ban paid search on brand terms, coupon spam, and marketing to under-21 audiences. Nicotine affiliate programs face payment-processor and platform churn. **Termination risk is high and largely outside NicFinder's control.** FTC disclosure applies (Phase 1 §1.6), as does state-law geofencing (Phase 1 R12).

**Funnel economics (base case) [A]:** 6% of monthly users click the online offer × 10% buy × $90 average order × 5% commission ≈ **$0.027 per monthly user**. With a 1-day cookie there is little revenue from repeat purchases. **10k users ≈ $270/month.**

## 4. Direct sponsorships (retailers, chains, distributors; **not** manufacturers)

**What a store buys [I]:** (a) a "Featured" slot *above* the neutral list, clearly labeled; (b) a verified-profile badge ("price updated by store, last Oct 30"); (c) deal posting ("5 cans for $40 this week"); (d) a monthly foot-traffic report (directions clicks, page views).

**Design rules that preserve trust:**
1. **Neutral ranking is never for sale.** "Sort by price" and "best price nearby" ignore payments, always.
2. A sponsored card shows **"Sponsored"** in the same font size as the store name, on a distinct background, and **its price must be as fresh as non-sponsored prices or it can't show**.
3. Sponsors cannot edit or comment on competitors' prices (Reviews Rule, Phase 1 R9).
4. Publish a one-paragraph "How we make money" page.
5. A sponsor that is not the cheapest still appears in the neutral list at its true rank.

**Pricing [A]:** independents $50–200/month; chains, negotiated. **Who pays [I]:** cheap stores (being found is their advantage) and stores in dense, competitive blocks. Expensive stores won't. That self-selection is fine. It also means sponsorship revenue is bounded by the number of *price-leader* stores, perhaps 5–15% of a market.

**Distributors** (wholesalers supplying c-stores) might sponsor content or buy data (§5) rather than consumer placements.

## 5. B2B price intelligence

**Why it might work [I]:** syndicated scanner data (NielsenIQ, Circana) and shipment data (Management Science Associates) are the industry standard, but they have documented gaps in channels outside their store panels. Specialist and independent retailers are poorly covered, and one review notes estimates that more than half of US e-cigarette sales happen outside IRI/Nielsen-tracked channels [S: PMC review of tobacco sales data]. Independent c-stores and smoke shops are exactly where pouch price dispersion lives. State programs also run manual tobacco price surveys (e.g., the Massachusetts Tobacco Availability and Pricing Survey, FY2024 [V: mass.gov]), which shows that institutions pay for shelf-price observation today.

**Candidate buyers and what they would demand:**

| Buyer | Use | Coverage & verification they'd demand | Willingness to pay [A/Sp] |
|---|---|---|---|
| Brand teams/competitors (ALP, Velo/RJR, on!/Altria, Rogue) | Competitive pricing; promo effectiveness | Multi-metro, ≥ hundreds of stores per metro, monthly | High per contract ($2–10k/mo), **but manufacturer money conflicts with consumer neutrality**. Sell data only, never placement. Requires counsel's view. |
| Distributors/wholesalers | Retailer pricing guidance; margin benchmarking | Their territory; monthly | $300–1,500/mo |
| C-store chains (category managers) | Price-position vs. neighbors | Stores near their locations | $300–2,000/mo |
| Equity/credit analysts covering PM, MO, BTI, Haypp | Price-elasticity signals; tax pass-through | Consistent panel, time series, methodology note | $500–5,000/mo (alternative-data budgets) |
| Public health researchers, state agencies, NGOs | Tax pass-through studies; youth-access pricing | Rigor, documented methods | Grants/contracts $5–50k/project |
| Online retailers (Haypp) | Price gap vs. local stores ("we're 55% cheaper") | Many metros | $500–3,000/mo, or a partnership |

**Minimum viable product [I]:** a monthly "Chicago Pouch Price Panel" PDF plus CSV covering ≥150 stores stratified by neighborhood and store type, with ZYN 6mg and 3mg, Velo, on! and Rogue prices, deal terms, tax status, collection method, and an audit error rate. **Price: $500–1,500/month or $3–5k for a one-off report [A].** Validate with five buyer conversations (the business doc's experiment 5) *before* building anything.

**Tax design note:** sell it as a delivered report or file feed, not a hosted dashboard. A dashboard sold to Chicago customers triggers Chicago's 15% lease tax (Phase 2 §4).

## 6. Premium consumer features
Alerts, history, and a multi-store tracker. **Willingness to pay is low [A]:** the purchase frequency is high, but the decision is simple (learn the cheapest store once). Assume ≤0.5% of monthly users convert at $2–3/month: 10k users → about $100–150/month. **Use these features for retention, not revenue.**

## 7. The local-vs-online tension, and ethical UX

**Problem:** the cheapest pouch is almost always online (≈$3.50–4.50/can vs. $8–10 in Chicago stores, per the business doc's benchmarks). An honest "lowest price" answer would always be "buy online," which (a) hollows out the local-store product, (b) alienates potential retailer sponsors and B2B buyers, and (c) makes NicFinder a commissioned lead generator for one company.

**Recommended pattern:**
1. **Separate questions, separate modules.** The primary answer is "Cheapest *in-store* near you, now." A secondary, collapsible card below the local list reads "Prefer to order online? Typical online price $X/can (ships in 2–5 days; minimum order; tax and shipping vary). *We may earn a commission.*"
2. **Show the online benchmark even without a commission relationship** (e.g., a median across several retailers), so the information isn't contingent on payment. Link the affiliate option only as one of several.
3. **Never interleave** online offers inside the local ranking, never use "best deal" badges on affiliate links, and never pop up interstitials.
4. **Respect user choice:** a settings toggle to "hide online prices."
5. **Geofence** the online card to states where merchants ship lawfully (Phase 1 R12).

## 8. Financial scenarios

**Formulas** (monthly):
- Display = users × pageviews/user ÷ 1,000 × RPM × fill
- Affiliate = users × CTR_to_online × conversion × AOV × commission
- Sponsorship = min(users/10k × sponsors per 10k users, 5% of stores) × price
- B2B = customers per 1,000 covered stores × max(1, stores/1,000) × price
- Data upkeep = stores covered × cost per store-month (Phase 4/5 will refine; base $1.00 assumes mostly low-cost collection plus periodic verification)
- Fixed = $300 (insurance, legal reserve, tools) + $30 hosting + $0.002 × users

**Stores covered by tier [A]:** 1k users → 300 stores; 10k → 1,000 (all of Chicago's core); 50k → 2,500 (Chicago + suburbs); 100k → 6,000 (2–4 metros); 500k → 25,000 (≈15–25 metros).

| Input | Low | Base | High |
|---|---|---|---|
| Pageviews/user/mo | 1.5 | 2.5 | 4.0 |
| Effective RPM (restricted) | $0.50 | $1.50 | $3.00 |
| Fill | 40% | 60% | 80% |
| Click-to-online share | 3% | 6% | 10% |
| Online conversion | 5% | 10% | 15% |
| Average order | $60 | $90 | $130 |
| Commission | 4% | 5% [S1] | 8% |
| Sponsors per 10k users | 0.5 | 2 | 5 |
| Sponsor price/mo | $50 | $100 | $200 |
| B2B customers per 1,000 stores covered | 0 | 1 | 3 |
| B2B price/customer/mo | — | $750 | $1,500 |
| Data cost per store-month | $2.50 | $1.00 | $0.50 |

**Results (USD/month):**

| Users/mo | Case | Display | Affiliate | Sponsorships | B2B | **Revenue** | Data upkeep | Fixed | **Net** |
|---|---|---|---|---|---|---|---|---|---|
| 1,000 | low | $0 | $4 | $2 | $0 | **$6** | $750 | $332 | **−$1,076** |
| 1,000 | base | $2 | $27 | $20 | $750 | **$799** | $300 | $332 | **+$167** |
| 1,000 | high | $10 | $156 | $100 | $4,500 | **$4,766** | $150 | $332 | **+$4,284** |
| 10,000 | low | $3 | $36 | $25 | $0 | **$64** | $2,500 | $350 | **−$2,786** |
| 10,000 | base | $22 | $270 | $200 | $750 | **$1,242** | $1,000 | $350 | **−$108** |
| 10,000 | high | $96 | $1,560 | $1,000 | $4,500 | **$7,156** | $500 | $350 | **+$6,306** |
| 50,000 | low | $15 | $180 | $125 | $0 | **$320** | $6,250 | $430 | **−$6,360** |
| 50,000 | base | $112 | $1,350 | $1,000 | $1,875 | **$4,338** | $2,500 | $430 | **+$1,408** |
| 50,000 | high | $480 | $7,800 | $5,000 | $11,250 | **$24,530** | $1,250 | $430 | **+$22,850** |
| 100,000 | low | $30 | $360 | $250 | $0 | **$640** | $15,000 | $530 | **−$14,890** |
| 100,000 | base | $225 | $2,700 | $2,000 | $4,500 | **$9,425** | $6,000 | $530 | **+$2,895** |
| 100,000 | high | $960 | $15,600 | $10,000 | $27,000 | **$53,560** | $3,000 | $530 | **+$50,030** |
| 500,000 | low | $150 | $1,800 | $1,250 | $0 | **$3,200** | $62,500 | $1,330 | **−$60,630** |
| 500,000 | base | $1,125 | $13,500 | $10,000 | $18,750 | **$43,375** | $25,000 | $1,330 | **+$17,045** |
| 500,000 | high | $4,800 | $78,000 | $50,000 | $112,500 | **$245,300** | $12,500 | $1,330 | **+$231,470** |

**How to read this:**
- **Remove B2B and every base case is negative or roughly break-even.** For example, at 500k base, consumer revenue is $24.6k against $26.3k of costs. **Consumer monetization cannot plausibly fund paid price collection.** That is the clearest finding of this phase.
- The *low* case (data costs $2.50/store-month, no B2B) is deeply negative at every scale. If collection costs look like the low case (e.g., heavy calling with poor answer rates; see Phase 4), **cover fewer stores**.
- The *high* case looks attractive, but it stacks optimistic assumptions (10% click-to-online, 3 B2B customers per 1,000 stores). Treat it as an upper bound.
- **Founder time is unpaid and excluded.** At 10k+ users, moderation, store disputes, and data QA could take 10–20 hours a week [A].
- **Traffic is the hard part.** Reaching 50k monthly users with no paid acquisition on a low-frequency need is itself unproven (Phase 7).

**Implication for operations:** prefer collection methods with near-zero marginal cost (community confirmations, retailer self-reporting, partner feeds), and use paid collection (human or automated calls) as a *sampling and verification* layer sized to what B2B revenue funds.

## 9. Strategic acquirers and partners

**No evidence was found that any company has expressed interest in acquiring a nicotine price-comparison site [I].** The analysis below is about fit, not likelihood.

| Candidate | Rationale | Fit | What they'd need to see |
|---|---|---|---|
| **Haypp Group** (Nicokick, Northerner) [V owner] | Customer acquisition in the US (a high-intent "where to buy pouches" audience); price-gap marketing; offline price intelligence | Medium-High strategic fit; small check size. Haypp targets a 5.5% adjusted EBIT margin by 2028 [S: Stockanalysis summary of Q1 2026], so it is disciplined on spend. | Organic traffic ≥50–100k/mo; affiliate conversion data; clean compliance; a multi-metro dataset |
| Price/consumer apps (GasBuddy-type, local deals apps) | Add a category | Low (nicotine is brand-toxic for mainstream apps) | — |
| **Data/insights firms** (NielsenIQ, Circana, MSA, tobacco-specific consultancies) | Fill the independent-channel gap with shelf observations | Medium (as a data-supply partner or tuck-in) | A methodology document; audit error rates; longitudinal panel ≥12 months; multi-metro coverage; clean provenance |
| Nicotine brands (ALP, Rogue, others) | Competitive intelligence | Conflicted (destroys neutrality) | — |
| Convenience-retail tech (POS/loyalty platforms) | Price-benchmark features for their retailers | Low-Medium | Store-level coverage and an API |

**Credible milestones before any acquisition talk [I]:** (1) a 12-month longitudinal panel in ≥3 metros with ≥2,000 stores; (2) a documented audit error rate below 3%; (3) ≥2 paying B2B customers; (4) organic traffic ≥50k monthly users with ≥25% returning; (5) zero unresolved compliance claims.

**Valuation approaches [A/Sp]:** small content/data websites commonly trade on a multiple of trailing **profit** (often roughly 2–4× annual seller's discretionary earnings on marketplaces). Data businesses with recurring contracts can command revenue multiples (≈1–4× ARR for small, concentrated customer bases). A strategic buyer might pay for traffic (cost-per-acquisition logic: if Haypp values a new US customer at $X, then (customers delivered/yr) × X sets a ceiling). **Example:** 1,000 referred customers/yr × an assumed $40 acquisition value = $40k/yr, which supports perhaps $80–160k. That is meaningful for a solo founder, not venture-scale.

**Diligence a buyer would request:** data provenance and licenses (Phase 1 §5); calling compliance files (line-type evidence, disclosures, opt-outs); traffic analytics and age-gate implementation; revenue by source and customer concentration; IP chain of title (Phase 2); terms and privacy compliance; open disputes with stores.

## 10. What would change this analysis
- **A paying B2B customer at ≥$500/month** → shifts the business to data-first; consumer site becomes the collection and marketing layer.
- **Haypp (or another merchant) confirms a higher commission (≥10%) or a longer cookie (≥30 days)** → affiliate economics improve several-fold, but the tension in §7 grows.
- **Google serves normal ads on NicFinder price pages in practice** → display becomes modest pocket money at scale; still not a business.
- **Data collection proves to cost ≤$0.30 per store-month** (community- and retailer-fed) → consumer-only break-even becomes plausible at ~100k users.

## Sources (accessed 2026-11-04)
- Google Publisher Restrictions (tobacco, restricted ad serving): https://support.google.com/publisherpolicies/answer/10437539 ; https://support.google.com/adsense/answer/10437795 ; https://support.google.com/admanager/answer/10437795 ; Google policy-simplification post: https://blog.google/products/adsense/simplifying-our-content-policies-publishers/
- Google Ads Dangerous products (tobacco): https://support.google.com/adspolicy/answer/6014299
- Yahoo ad policy, tobacco incl. nicotine pouches: https://adspecs.yahooinc.com/pages/policies-guidelines/yahoo-ad-policy/advertising-categories/tobacco
- Meta tobacco ad policy: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/tobacco-related-products/ ; Microsoft: https://about.ads.microsoft.com/en-au/policies/disallowed-content/tobacco-products
- Nicokick affiliate (aggregator): https://getlasso.co/affiliate/nicokick-tobacco/ ; https://getlasso.co/affiliate/nikokick/
- Northerner affiliate (aggregator): https://shopper.com/partnerships/nicokick-com-affiliate-program
- Haypp ownership and US activity: https://www.businesswire.com/news/home/20260615256411/en/Haypp-Group-Announces-ZYN-ULTRA-Nationwide-Launch-through-U.S.-E-commerce-Platforms-Nicokick.com-and-Northerner.com ; https://tobaccoreporter.com/?p=165373 ; https://www.galvnews.com/haypp-group-resumes-operations-in-alabama-expanding-access-for-verified-adult-consumers/article_ab2eaab2-6f13-5106-ba13-671be2ad2473.html
- Haypp 2025 annual report (net sales SEK 3,848.9m): https://storage.mfn.se/5735977e-d398-4af5-b7b3-9a1c876015ee/annual-report-2025-haypp-group-eng.pdf ; Q4 2025 release: https://www.inderes.fi/en/releases/year-end-report-2025-accelerating-topline-signals-strong-momentum-into-2026-haypp-in-pole-position-to-leverage-continued-nicotine-pouch-growth-in-the-us-and-europe ; targets: https://stockanalysis.com/quote/otc/HYGRF/
- Tobacco sales data coverage gaps (PMC review): https://pmc.ncbi.nlm.nih.gov/articles/PMC10187338 ; MSA description: https://pmc.ncbi.nlm.nih.gov/articles/PMC6195827 ; NielsenIQ tobacco data (WRDS): https://wrds-www.wharton.upenn.edu/pages/about/data-vendors/vendor-partner-vendor-partner-nielseniq/
- Massachusetts Tobacco Availability and Pricing Survey FY2024: https://www.mass.gov/doc/massachusetts-tobacco-availability-and-pricing-survey-fiscal-year-2024/download

**Not verified:** merchant-confirmed commission rates and cookie windows; Mediavine/Raptive/Ezoic tobacco-content policies; actual RPMs for nicotine-adjacent pages; any B2B data price points (all [A]).
