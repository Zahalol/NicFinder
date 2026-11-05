# 08 — Demand Ceiling, Competitors, and User Acquisition

**Prepared:** 2026-11-04 · Phase 7 memo. Labels: [V] [S] [S1] [A] [I] [M].

## Bottom line
1. **The Chicago consumer audience is small by construction.** A top-down estimate from PMI's reported volumes implies about **5–6 million US nicotine-pouch users**, about **160k in the Chicago metro**, and about **46k in the city** [I/A, §1]. At GasBuddy-like penetration (≈2.5% monthly use, the best-case analog), a Chicago-only site plateaus at about **1,100 monthly users (city) or 4,000 (metro)**. **The Phase 3 tiers of 50k–500k monthly users are only reachable nationally.**
2. **This makes the business doc's kill criterion ("MAU < 2,000 after full-city coverage → stop") roughly the *ceiling* for city-only coverage, not a floor.** Recommendation: restate the consumer gate as **penetration of estimated pouch users** (e.g., ≥1.5% of estimated users in covered areas as monthly users) and judge the business mainly on B2B gates.
3. **Competitors exist but are thin.** **Nicotinly** (community-reported; the live site still features only GA/FL/NC/SC; a search snippet cites 181 prices across 94 stores in 19 cities and 4 states [S1]). **PouchBuddy** (a *quit-tracking* app with 375k+ pouches logged; its price map is a by-product: **the median of 56 US receipts in 12 months**, with state medians only where two people have reported [V: live site, 2026-11-04]). Takeroon and Tobacco Insider publish modeled state price tables. **No one has dense, verified, store-level coverage anywhere.** The crowdsourced competitors' tiny counts are themselves evidence that pure crowdsourcing doesn't produce coverage.
4. **Distribution is almost entirely organic web.** Google Ads and Meta prohibit nicotine-product ads (Phase 3). Apple's App Store Guideline 1.4.3 prohibits apps that encourage tobacco/vape consumption or facilitate their sale [S: Apple guideline history via press; developer-forum rejections of tobacco apps in 2025–26]. **A native price-finder app would likely be rejected; stay web-first** (the repo already is). PouchBuddy gets onto the App Store as a *quitting* app, which a price finder is not.

## 1. Demand sizing (top-down, reproducible)
```
US ZYN cans/yr      = 3.2B pouches/quarter × 4 ÷ 15 pouches/can ≈ 853M cans   [V: PMI Q3 2026 8-K volume; can size]
ZYN regular users   = 853M ÷ 250 cans/user/yr [A: ~5 cans/week] ≈ 3.4M
All pouch users     = 3.4M ÷ 0.60 ZYN share [A; share contested 33–67%] ≈ 5.7M
Chicago metro       = 5.7M × (9.4M/335M population) ≈ 160k   [population shares M]
Chicago city        = 5.7M × (2.7M/335M) ≈ 46k
```
**Cross-check [S]:** survey prevalence of past-30-day pouch use among US adults ranges from ≈0.8% (JAMA Netw Open 2025) to 4.2% in a young-adult panel (2024). Applying ≈2% to ~260M adults gives ≈5M users, consistent with the estimate. **Uncertainty:** ±50%. If ZYN's share is closer to one-third, total users roughly double.

**Monthly-user ceilings at different penetration rates:**

| Area | Est. pouch users | 1% | 2.5% (GasBuddy-like) | 5% (exceptional) |
|---|---|---|---|---|
| Chicago city | ~46k | ~460 | ~1,150 | ~2,300 |
| Chicago metro | ~160k | ~1,600 | ~4,000 | ~8,000 |
| US (national coverage) | ~5.7M | ~57k | ~140k | ~285k |

**GasBuddy benchmark:** ≈90M downloads and ≈5.7M monthly active users as reported in a 2020 SEC filing (Root, Inc. registration statement) [V]. Against ~230M US drivers [M], that is roughly 2.5% monthly penetration, after more than a decade, for a need that recurs weekly, with brand-safe advertising and app-store distribution, none of which NicFinder has. **2.5% is an optimistic ceiling for NicFinder, not a base case.**

## 2. Competitor map

| Name | What it is (verified) | Coverage/traction evidence | Threat | Lesson |
|---|---|---|---|---|
| **Nicotinly** (nicotinly.com) | Community pouch price finder; 21+ notice; brand and state pages | Homepage features only GA, FL, NC, SC [V]; snippet: 181 prices / 94 stores / 19 cities / 4 states; ZYN national median based on 9 reports [S1] | Low | Crowdsourcing without seed data stays sparse |
| **PouchBuddy** (pouchbuddy.app) | Quit/tracking app (iOS/Android) with price logging; web price map | 375,507+ pouches tracked; **56 US ZYN receipts/12 months**; CA median $7.00, range $6.50–9.75 (11 reports) [V] | Low as a price finder; **interesting as a partner** (users log what they paid) | Spending-tracking is a hook; quit framing gets app-store distribution |
| Takeroon / Tobacco Insider / SmokeCalc / World Population Review | Content sites with modeled state price tables | SEO-ranking pages for "ZYN price by state" [V via search] | Medium **for SEO** (they own the generic queries) | Win on *local* queries ("ZYN price Lakeview") and verified data, not generic ones |
| Online retailers (Nicokick/Northerner = Haypp; others) | Sell pouches online at $3.49–4.49/can | Large; Haypp 2025 net sales SEK 3.85bn [V] | Indirect (the "buy online" alternative) | Show online benchmark honestly (Phase 3 §7) |
| GasBuddy / Upside / Waze | Fuel price apps | 5.7M MAU (2020) | None (won't touch nicotine) | Copy one-tap confirmations; avoid ad clutter |
| Data vendors (NielsenIQ, Circana, MSA) | Scanner/shipment data | Industry standard, with gaps in independent channels [S] | Competitor *and* potential partner for B2B | Position as complementary shelf-observation data |

## 3. User acquisition: what's actually available

| Channel | Status | Realistic contribution |
|---|---|---|
| **Organic search (SEO)** | Available. Google's organic results have no nicotine ban. Generic queries are owned by content sites; local long-tail ("ZYN price 60614", "cheapest ZYN near Wrigley") is uncontested [I]. | **Primary channel.** The repo already builds `/zyn-prices/[zip]` pages. The tax-explainer and "Chicago vs. Indiana" index are linkable assets. |
| **Earned media / PR** | Available. Local press covered the 2025 Illinois tax (Axios, CBS, CSP) [V]. | A "Chicago ZYN Price Index" with real dispersion data is newsworthy once, then quarterly. |
| **Reddit and communities** | Subreddit-specific self-promotion rules; nicotine topics are allowed in some subs (r/Zyn, r/Snus), and local subs are skeptical of promotion [I]. | Spiky referral traffic; good for feedback. |
| **Paid search/social** | Google Ads, Meta, and Microsoft prohibit nicotine-product promotion (Phase 3) | ≈0; don't plan on it |
| **App stores** | Apple 1.4.3 prohibits facilitating tobacco sales [S] | ≈0 for a price finder |
| **Retailer co-marketing** | Cheap stores can display a "Find our price on NicFinder" counter card or QR code | Small but compounding; also recruits store self-reporting |
| **Partnerships** | e.g., PouchBuddy (users already log prices); a data partnership is plausible [Sp] | Unknown; worth one email |

**Conversion and retention assumptions [A]:** pouch prices are sticky, so the rational user visits, learns the cheapest nearby store, and rarely returns unless something changes (a price change, a new store, travel). Expect a low natural return rate. **Alerts** ("your store's price changed", "a cheaper store opened near you") are the main retention lever and should be the first premium-style feature. They are also what creates repeat visits for B2B-relevant data collection (confirmations).

## 4. Implications
- **Consumer site = marketing and collection front end, not the business.** Its job is to (1) earn search traffic and press for the price index, (2) collect confirmations and store self-reports, and (3) demonstrate the dataset to B2B buyers.
- **National consumer scale requires national data**, which is exactly what the economics in Phases 3–5 say is expensive unless it is community- or retailer-fed. **Don't pursue national consumer scale before B2B revenue exists.**
- **Recalibrate gates** (founder brief): judge consumer traction by penetration of estimated users in covered areas, search impressions, and press pickup, not absolute MAU.

## Sources (accessed 2026-11-04)
- PMI Q3 2026 earnings release (ZYN 3.2B pouches): https://www.sec.gov/Archives/edgar/data/0001413329/000162828026066596/earningsreleasepm-ex991xq3.htm
- Nicotinly (live): https://nicotinly.com/ ; brand page snippet: https://nicotinly.com/brands/zyn
- PouchBuddy (live): https://pouchbuddy.app/ ; https://pouchbuddy.app/tools/nicotine-pouch-prices
- GasBuddy MAU in Root, Inc. registration statement (2020): https://www.sec.gov/Archives/edgar/data/1788882/000162827920000172/filename1.htm
- Pouch-use prevalence: https://reachmd.com/news/few-us-adults-use-nicotine-pouches-nationally-representative-study-finds/2467303/ ; https://www.news-medical.net/news/20240711/Prevalence-of-nicotine-pouch-use-found-to-be-low-among-US-adults.aspx
- Apple Guideline 1.4.3 history and enforcement: https://www.iclarified.com/79555/apple-updates-app-store-review-guidelines-with-app-tracking-transparency-requirement-more ; https://www.pymnts.com/mobile/2019/apple-to-pull-all-vaping-apps-from-app-store/ ; https://developer.apple.com/forums/thread/836826
- Modeled price-table competitors: https://www.takeroon.com/blog/zyn-price-by-state ; https://tobaccoinsider.com/how-much-are-zyns/ ; https://quitsmokingcalc.com/zyn-prices
