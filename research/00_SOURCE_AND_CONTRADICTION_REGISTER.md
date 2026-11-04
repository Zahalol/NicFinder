# 00 — Source and Contradiction Register

**Purpose:** Track material claims made in the pre-existing repository documents (`docs/BUSINESS_RESEARCH.md`, `docs/ELEVENLABS_CALLING_RESEARCH.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/ROADMAP.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`), whether this research effort independently verified them, and where sources disagree.
**Started:** 2026-11-04. Updated at the end of each phase.
**Status labels:** **VERIFIED** (primary or strong secondary source checked this session) · **PARTLY VERIFIED** · **UNVERIFIED** (not yet checked) · **CONTRADICTED** (evidence points the other way) · **RECONCILED** (conflict explained) · **OPEN** (needs counsel, the pilot, or a primary source we could not reach).

All access dates are 2026-11-04 unless stated.

---

## A. Known discrepancies called out by the founder

| ID | Claim(s) | Where | Status | Resolution / owner |
|---|---|---|---|---|
| D1 | Cost per successful price ≈ **$0.90** vs ≈ **$0.20** | BUSINESS_RESEARCH §4.1 (A1 = $0.35/dial at 3.5 min × $0.10/min; 39% net success) vs ELEVENLABS_CALLING_RESEARCH §6.2 ($0.118/attempt; 60% success; 75 s calls) | **RECONCILED in Phase 4** (`04_ELEVENLABS_TWILIO_ACCURACY_AND_UNIT_ECONOMICS.md` §7) | The two figures differ in three ways at once. First, the $0.90 model assumes every dial costs 3.5 minutes, but unanswered calls cost almost nothing and a price question takes about a minute. Second, the success rates differ (39% vs 60%). Third, neither figure is "per *accurate* price": both count model-generated numbers that were never audited. Phase 4 rebuilds both on one set of assumptions. |
| D2 | "Google Ads … prohibit nicotine" used to imply the site can't run Google display ads | BUSINESS_RESEARCH §6.1, §7 | **RECONCILED in Phase 3** (`03_MONETIZATION_AND_EXIT_OPTIONS.md` §2) | Google Ads is the advertiser side: it decides whether *NicFinder may buy ads*. Google Publisher Policies/AdSense is the publisher side: it decides whether *NicFinder pages may show ads*. These are separate rule sets. Phase 3 verifies each one separately. |

## B. Legal / regulatory claims (Phase 1 audit)

| ID | Prior claim | Status | Evidence / note |
|---|---|---|---|
| L1 | FCC Feb 8, 2024 Declaratory Ruling (FCC 24-17, CG 23-362): AI voices = "artificial or prerecorded voice" under the TCPA | **VERIFIED** | Federal Register docket page for the AI NPRM summarizes the ruling: https://www.federalregister.gov/documents/2024/09/10/2024-19028/implications-of-artificial-intelligence-technologies-on-protecting-consumers-from-unwanted-robocalls |
| L2 | FCC AI-disclosure rulemaking (NPRM FCC 24-84) still pending, no final rule | **VERIFIED (secondary, as of ~Sept 2026)** | Multiple 2026 compliance summaries report no Report & Order. No FCC primary docket update was retrieved, so re-check ECFS docket 23-362 before launch. |
| L3 | Artificial-voice calls to wireless numbers need prior express consent even when informational | **VERIFIED** (statute 47 U.S.C. §227(b)(1)(A)(iii); TCPAWorld consent primer 2025-04-07) | Informational calls need "prior express consent" (oral is OK); telemarketing calls need prior express *written* consent. |
| L4 | No TCPA consent requirement for artificial-voice informational calls to *business landlines* | **PARTLY VERIFIED (inference from statute text)** | §227(b)(1)(A) lists emergency lines, patient rooms, and wireless/paging/charged-for services. §227(b)(1)(B) covers *residential* lines. A business landline is in neither list. But the identification rules in §64.1200(b) still apply to every artificial-voice message, and misclassifying a number is the caller's risk. No secondary source squarely confirmed this for AI calls, so it stays a **counsel question**. |
| L5 | Residential informational prerecorded calls are capped at 3 per 30 days, with opt-out | **VERIFIED** | Effective July 20, 2023 (88 FR 3668, Jan 20, 2023): https://www.govinfo.gov/content/pkg/FR-2023-01-20/html/2023-00634.htm |
| L6 | TCPA damages $500/violation, up to $1,500 if willful | **VERIFIED** (47 U.S.C. §227(b)(3)) | No cap on aggregate damages, and class actions are common. |
| L7 | Illinois eavesdropping civil remedy "includes a $10,000-per-violation figure" | **CONTRADICTED / not found** | ELEVENLABS_CALLING_RESEARCH §3.4 says "verify against statute text." The 720 ILCS 5/14-6 text lists an injunction, **actual damages, and punitive damages**. It has no fixed statutory amount: https://ilga.gov/legislation/ilcs/documents/072000050K14-6.htm. The criminal offense is a Class 4 felony for a first offense (720 ILCS 5/14-4). |
| L8 | Illinois eavesdropping covers *transcribing* | **PARTLY VERIFIED** | The 2014 rewrite (P.A. 98-1142) covers transcribing private *electronic communications* and recording private *conversations*. In either case the conduct must be **surreptitious** ("by stealth or deception … secrecy or concealment", §14-1). Disclosing at the start of the call goes directly at that element. |
| L9 | Illinois Automatic Telephone Dialers Act (815 ILCS 305) may apply | **PARTLY VERIFIED** | §15 (as reproduced in bill texts) bars autodialer calls between 9 p.m. and 9 a.m., requires the caller to identify itself and ask for consent at the start of a prerecorded message, and requires disconnecting within 30 s. Penalties and any private right of action were **not confirmed** this session. Whether an interactive AI agent is a "recorded message" is **OPEN**. |
| L10 | Illinois Tobacco Products Tax raised to 45% of wholesale, nicotine pouches included, eff. July 1, 2025 | **VERIFIED (primary)** | IDOR Informational Bulletin FY 2025-31: https://tax.illinois.gov/research/publications/bulletins/fy-2025-31.html. Retail license fee rose from $75 to $150 per location. |
| L11 | Prior rate "36%" vs "15%" | **RECONCILED (inference)** | The enacted bill text and IDOR say tobacco products were taxed at 36% before July 2025. The "15% → 45%" figure (CBS) most plausibly describes *vape/e-cigarette* products, which were taxed at 15% of wholesale. Pouches were previously outside the tax base (Axios). |
| L12 | Cook County smokeless tax $0.60/oz; applicability to leaf-free pouches unresolved | **UNVERIFIED (still OPEN)** | No 2025–26 county source found. Only the 2013 notice. Ask Cook County Dept. of Revenue or counsel. This does not affect site legality. It only affects any tax explanation shown on the site. |
| L13 | No Chicago city tax on pouches after *Iwan Ries* (2019) | **PARTLY VERIFIED** | The case is verified (Justia). No newer city ordinance was found. Low materiality. |
| L14 | "Publishing truthful price info is protected speech" | **REASONABLE, NOT A GUARANTEE** | Truth is a defense to defamation and trade libel. Section 230 protects *user* reports, not NicFinder's own called or imported prices. See Phase 1 §3. |
| L15 | Google Places-seeded store data | **OPEN (provenance risk)** | `prisma/seed.ts` says the 27 stores came from the founder's exploratory workbook, and the calling doc says "Google Places / OSM seeded." Google's terms restrict long-term caching of Places content except `place_id` (Service Specific Terms, 2024 versions). See Phase 1 §7. |

## C. Market / pricing claims (audited in Phases 3, 6, 7)

| ID | Claim | Status |
|---|---|---|
| M1 | Nicotinly is the only direct competitor | Re-checked in Phase 7 (`07_…`) |
| M2 | PMI Q3 2026 ZYN 3.2B pouches (+4.2%); 15→20-pouch transition | Cited to SEC 8-K; spot-check in Phase 7 |
| M3 | US pouch retail ≈ $6.6B TTM, +20% | Secondary (Bloomberg via 2Firsts). Treat as context only. |
| M4 | Chicago ZYN ≈ $8–10/can; IL $9.92 "observed" | Takeroon table is mostly modeled ("not receipts"). Not a shelf audit. **UNVERIFIED as a Chicago distribution.** |
| M5 | Intra-city dispersion $1.50–3.00+/can | **ASSUMPTION.** The business doc itself says so. Decides go/no-go (gate G1). |
| M6 | ~1,200 c-stores in Chicago; 1,500–3,000 licensed tobacco retailers | Naive scaling. Re-estimated in Phase 5. |
| M7 | ElevenLabs Agents $0.08/min; plan concurrency 4–40; burst $0.16/min | **VERIFIED** ($0.08 and $0.16 burst, from multiple 2026 sources). Billing granularity is **OPEN**. |
| M8 | Twilio $0.014/min outbound, $1.15/number, AMD $0.0075/answered call; billed per started minute | **VERIFIED** for $0.014 and AMD. Whole-minute rounding comes from a third-party test only. Lookup line type costs $0.008. |
| M9 | Answer rate 65%, price-given 60% (business doc) vs success 50–70% (calling doc) | **Both are unsupported assumptions.** The only anchors found: 411 Locals (≈38% of small-business calls answered by a person) and **PHR 2009 (telephone cigarette prices not valid vs. in-store)**. |
| M10 | Nicokick/Northerner/Prilla affiliate programs "exist" | **PARTLY VERIFIED.** Nicokick (5%, 1-day cookie, CJ) and Northerner (5–10%) appear only on aggregators. **Both are owned by Haypp Group.** No Prilla affiliate program was found. |

## D. Open questions log (carry forward)

1. Is an interactive LLM voice agent a "recorded message" under 815 ILCS 305? (counsel)
2. What share of listed Chicago c-store phone numbers are wireless or non-fixed VoIP? (measurable with a line-type lookup on the store list. This is a lookup, not a call, but run it only once counsel approves the program.)
3. Cook County OTP tax applicability to leaf-free pouches. (county)
4. Provenance of the 27 seeded store records: Google-derived or not? (founder)
5. Exact ElevenLabs and Twilio billing granularity in practice. (only measurable in an authorized test)
6. Whether any state's affiliate or "delivery-sale" rules reach a publisher that links to an online nicotine seller. (counsel, Phase 3)

## E. Change log
- 2026-11-04: Register created during Phase 1. L7 marked contradicted, L10 verified from IDOR, L11 reconciled, D1/D2 assigned to Phases 4/3.
- 2026-11-04: Phase 3. D2 resolved (Google Ads = advertiser-side prohibition; Publisher Policies = restricted serving). M10 updated.
- 2026-11-04: Phase 4. D1 reconciled ($0.90 overstated per-dial cost ~8×; both figures omitted accuracy, QA, and fixed floors). M7–M9 updated.
