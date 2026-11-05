# 01 — Legal Exposure, Regulation, Compliance, and Founder Risk

**Prepared:** 2026-11-04 · **Phase 1 of 7** · Research only. **This is not legal advice.** It is a research associate's memo meant to make a meeting with counsel faster and cheaper. Every "likely" below is an analytical judgment, not a legal conclusion.
**Builds on:** `docs/BUSINESS_RESEARCH.md` §6 and `docs/ELEVENLABS_CALLING_RESEARCH.md` §3. Claims audited in `00_SOURCE_AND_CONTRADICTION_REGISTER.md` (cited as L1, L2, …).
**Evidence labels:** **[V]** verified against a primary source or strong secondary source this session · **[S]** secondary source only · **[I]** analytical inference · **[A]** editable assumption · **[?]** unresolved, needs counsel.

---

## The plain answers

**1. Can I legally operate an informational, age-gated local ZYN price comparison site?**
**Very likely yes [I].** No federal, Illinois, or Chicago rule was found that prohibits publishing accurate, lawfully obtained retail prices for a legal adult product. FDA's tobacco sale and advertising rules (21 CFR Part 1140) are addressed to *manufacturers, distributors, and retailers* [V]. A site that sells nothing, ships nothing, and takes no manufacturer money is not one of those. A 21+ gate is a prudent norm, not something a statute we found requires of an information site.

**2. What creates real liability?** In descending order of severity:
1. **Automated AI-voice calls to the wrong kind of phone number.** An artificial-voice call to a wireless number without prior express consent carries $500–$1,500 *per call* in statutory damages, with no cap [V]. This is the only activity here that could plausibly produce a six- or seven-figure judgment.
2. **Recording or transcribing calls without disclosure** in Illinois (eavesdropping statute: felony plus civil damages) [V], plus a smaller BIPA risk if voice data is used to identify speakers [S].
3. **Undisclosed or misleading monetization.** This covers affiliate links, sponsored rankings dressed up as neutral, and "verified" badges on prices that were never verified (FTC Act §5, Illinois Consumer Fraud Act) [V/I].
4. **Publishing your own wrong prices** about a named store (trade libel and commercial disparagement). This is low-likelihood and low-dollar if you have a correction policy and honest labels [I].
5. **Data-licensing and trademark sloppiness.** This covers Google-derived store data and use of the ZYN mark in a domain or logo. These usually produce takedowns or cease-and-desist letters, not damages [I].

**3. What could expose me personally?**
- **TCPA:** many federal courts hold individuals personally liable when they personally directed or participated in the unlawful calls. An LLC does **not** shield the founder who designs and launches the dialing program [S/I; counsel to confirm the Seventh Circuit position].
- **Illinois eavesdropping** is a *criminal* statute that applies to the person who does it [V].
- **FTC Act / Consumer Fraud Act:** individuals who participate in or have authority over deceptive practices can be named [S].
- In practice, the main personal exposure comes from the calling program. The website alone carries ordinary business risk that an LLC plus insurance handles reasonably well (Phase 2).

**4. What can I launch now, what needs review, and what must not happen without clearance?** See the staged gates in §11. In short:
- **Launch now:** the read-only directory, with prices collected by hand or by community reports with honest provenance labels; the age gate; a privacy policy; a correction policy.
- **Needs a one-time lawyer review:** site terms, the privacy policy, the takedown and correction policy, any "verified" badge claims, any affiliate or sponsorship deal.
- **Must not happen without written counsel clearance:** **any automated or AI-voice call to any store**, any call recording or transcription, any sales pitch to stores by phone, and any manufacturer-paid advertising.

---

## 1. Seven activities, analyzed separately

### 1.1 Read-only informational directory of public store details and accurately sourced prices

| Issue | Analysis |
|---|---|
| Tobacco regulation | FDA's Part 1140 regulates the sale and distribution of tobacco products, and its advertising rules bind "manufacturers, distributors, or retailers" [V: 21 CFR 1140.1, 1140.30 text via govinfo CFR 2025 vol. 8]. An information publisher that does not sell or distribute is outside those definitions [I]. Illinois and Chicago tobacco licenses are seller licenses (Chicago requires a tobacco license for *retail sale*; IL retail license fee $150/location as of July 2025 [V: IDOR FY2025-31]). **Not applicable while NicFinder sells nothing.** |
| First Amendment | Truthful price information about lawful products is commercial or informational speech that gets strong protection (cf. *Virginia State Board of Pharmacy v. Virginia Citizens Consumer Council*, 1976, which struck down a ban on advertising drug prices) [I; well-established doctrine]. |
| Accuracy | The site's **own** statements (called prices, imported prices, "cheapest near you" claims) are NicFinder's speech. That carries possible trade-libel exposure (§3) and deception exposure (FTC Act §5 / 815 ILCS 505) if labels overstate reliability. |
| Store facts | Names, addresses, phone numbers, and hours are facts and are not copyrightable (*Feist v. Rural Telephone*, 1991). The **database you copied them from** may still be under contract or license terms (Google, data vendors) or a database license (OSM ODbL). See §7. |
| **Net** | **Low risk [I].** Main controls: provenance and date on every price, a correction channel, and clean data licensing. |

### 1.2 User-submitted prices, deals, comments, optional receipt evidence

- **Section 230 (47 U.S.C. §230(c)(1))** generally bars treating a site as the publisher of third-party content. Courts have extended this to star-rating *aggregates* computed from user input (*Icon Health v. ConsumerAffairs*, D. Utah 2017) [S: Eric Goldman blog summary]. **No case was found squarely deciding a trade-libel claim over a user-submitted price [?].**
- **What erodes the protection [I]:** (a) NicFinder editing a user's price; (b) NicFinder "verifying" a user report and labeling it as verified by NicFinder, which arguably makes it NicFinder's own representation; (c) soliciting specifically defamatory content. Corroboration labels are fine if they are literally true ("confirmed by 3 users"). Avoid language that converts a user's report into NicFinder's guarantee.
- **Receipts:** receipts can contain card digits, loyalty numbers, and names. If you add receipt uploads later, strip EXIF, crop or blur card data, set a short retention period, and never publish raw receipt images [I]. Store-level price is the only datum needed.
- **Comments:** comments carry the classic UGC risks (defamation of named staff, harassment). The existing auto-hide/report flow in the app is the right shape. Add a rule against naming employees.
- **Consumer Review Fairness Act (15 U.S.C. §45b):** don't put clauses in the terms that penalize users for honest reviews. Not likely relevant, but don't copy boilerplate that does this [I].
- **FTC Consumer Reviews and Testimonials Rule (16 CFR Part 465, effective Oct 21, 2024)** bans fake reviews, buying positive or negative reviews, undisclosed insider reviews, and *suppressing* reviews. Civil penalties are ≈$53k per violation for knowing violations [S: multiple law-firm summaries; FTC warning-letter coverage]. **Relevance:** if NicFinder ever pays users for price reports, or lets a *sponsoring* store's owner post reports or comments about competitors without disclosure, this rule is implicated. Incentives must reward *accuracy*, not a particular outcome.
- **Net:** **Low to moderate risk.** Most exposure comes from moderation choices, not from hosting itself.

### 1.3 A human calling a publicly listed business number

- **TCPA:** the restrictions in §227(b) attach to autodialers and artificial or prerecorded voices. A live human dialing manually triggers neither [V: statute]. The Do-Not-Call rules (§227(c), 47 CFR 64.1200(c)–(d)) govern *telephone solicitations* (calls to encourage a purchase) to *residential* subscribers. A price inquiry is not a solicitation [I].
- **FTC Telemarketing Sales Rule:** applies to "telemarketing," meaning a plan to induce the *purchase* of goods or services or a charitable contribution. A pure price inquiry is outside it [I; 16 CFR 310.2 definition]. *But* the 2024 TSR amendments now apply TSR misrepresentation bans to B2B telemarketing [V: 89 FR 26760, Apr. 16, 2024, eff. May 16, 2024]. If a caller ever pitches **sponsored listings** to a store, that call is B2B telemarketing.
- **Illinois Telephone Solicitations Act (815 ILCS 413)** covers live-operator calls "soliciting the sale of goods or services" [S: statute text versions]. A price inquiry is not covered [I].
- **Recording:** if the human records the call, Illinois all-party consent applies (§1.5). The simplest policy is **no recording**: the caller types the price into a form.
- **Honesty:** the caller should say who they are ("I'm with NicFinder, a price-comparison site"). Pretexting as a customer is not illegal for a price question, but it undermines the defensibility and credibility of the data [I].
- **Net:** **Lowest-risk data-collection method [I].** The constraints are cost and scale, not law.

### 1.4 Automated dialing with an ElevenLabs-generated voice via Twilio

**Federal framework [V unless noted]:**
- **An AI voice is an "artificial voice."** The FCC's Declaratory Ruling FCC 24-17 (Feb 8, 2024, CG Docket 23-362) says so. *Caveat:* after *McLaughlin Chiropractic v. McKesson* (U.S. June 20, 2025), district courts are **not bound** by FCC interpretations and must read the statute themselves, giving the FCC "appropriate respect" [S: Manatt, Faegre Drinker alerts]. That cuts both ways, but the ordinary meaning of "artificial voice" plausibly covers a synthetic voice regardless [I]. **Plan as if the ruling applies.**
- **By line type:**

| Number type | Federal rule for a non-telemarketing AI-voice call | Practical posture |
|---|---|---|
| **Wireless** (incl. a store owner's cell listed as the store number) | Prior express consent required (§227(b)(1)(A)(iii)) [V]. Being "listed publicly by a business" is **not** consent for robocalls [I; this has been litigated repeatedly]. | **Exclude entirely** unless the store has given documented consent. |
| **Residential landline** (home-based "stores", mis-listed numbers) | Allowed without consent only within the exemption: ≤3 calls per 30 days, with identification and opt-out duties (64.1200(a)(3), eff. July 20, 2023) [V] | Exclude. Not worth the complexity. |
| **Business landline** (fixed, business-subscribed) | No consent requirement in §227(b)(1)(A) or (B) for this line type [I from statute; L4]. Identification duties of 64.1200(b) still apply [V]. | **Only candidate category**, *after* counsel confirms. |
| **Fixed VoIP** business line | Treated like a landline by most line-type databases. Courts are split on whether VoIP is a "service for which the called party is charged for the call" [?] | Counsel decides. Conservative default: include only fixed VoIP that the lookup returns as *business* type. |
| **Non-fixed VoIP** (Google Voice, app-based numbers) | Uncertain. Often personal and mobile-like [?] | **Exclude.** |
| **Mixed-use** (owner's cell = store line) | Still a wireless number for §227(b) purposes. Some courts also treat mixed-use cells as "residential" for DNC purposes [S] | **Exclude.** Store-owner cells are the single biggest trap for this business. |
| **Unknown** (lookup fails) | — | **Exclude.** |

- **Identification duties (47 CFR 64.1200(b)) [V/S]:** the message must state, **at the beginning**, the identity of the business responsible for the call, and must provide a telephone number (not the dialer's) during or after the message. An automated opt-out mechanism is mandatory for telemarketing messages, and FCC proposals would broaden it. The draft script in `docs/ELEVENLABS_CALLING_RESEARCH.md` §4.2 already does this. Keep it.
- **Informational research vs. telemarketing:** a price inquiry with no sales content is informational [I]. **Bright-line rule: never put any promotional content in a data-collection call.** That includes "list your store on NicFinder!", "upgrade to a featured listing", and even "check us out at nicfinder.com". Promotional content converts the call into telemarketing, where calls to wireless numbers need **prior express written consent**, the TSR applies, and the Illinois solicitation rules may apply [I].
- **Pending FCC AI-disclosure rules (NPRM FCC 24-84, Aug 2024):** still no Report & Order as of the latest sources (~Sept 2026) [S; L2]. If adopted, they would likely require in-call AI disclosure. The draft script already discloses up front.
- **Caller ID and STIR/SHAKEN:** the Truth in Caller ID Act (47 U.S.C. §227(e)) bans misleading caller ID *with intent to defraud or cause harm*. Use a real, NicFinder-registered number. The 2024 Lingo Telecom consent decree ($1M, Aug 2024) and the proposed $6M forfeiture against consultant Steve Kramer (the AI Biden robocalls) show the FCC treats AI calls with false attribution as a priority [S: The Record, CyberScoop]. That conduct is very different from NicFinder's design, but it is why the carriers' and the FCC's tolerance for "mystery AI caller" is near zero.

**Illinois framework:**
- **Automatic Telephone Dialers Act (815 ILCS 305) [S/?]:** as reproduced in bill texts, §15 bars autodialer calls between **9 p.m. and 9 a.m.**, requires a prerecorded message to identify the caller **and ask at the start whether the person consents to hear the message**, and requires disconnecting within 30 s after hang-up. Whether an *interactive* LLM agent is a "recorded message" is **unsettled [?]**. The conservative design treats it as one: identify, ask "is that okay?", and proceed only on a yes. The existing script already asks. Penalty provisions (§30) and any private right of action were **not verified** this session. **Counsel question.**
- **Hours:** combine the ATDA window (9 a.m.–9 p.m.) with store-hours logic and the calling doc's 10:00–17:00 Central policy. The 10–5 policy is stricter, so keep it.
- **Telephone Solicitations Act:** not applicable to a price inquiry [I].

**Other states (expansion):** "mini-TCPA" statutes are the reason a state-by-state review is mandatory before calling outside Illinois [I]. Examples: Florida's FTSA (as amended in 2023), Oklahoma's OTSA, Washington, and Maryland. Most are aimed at *telephone solicitation*, which a pure price inquiry is not. Several regulate *automated* calls more broadly, and state definitions differ. See §9.

**Realistic worst-case statutory exposure [I, illustrative only]:**

| Scenario | Calls in violation | At $500 | At $1,500 (willful) |
|---|---|---|---|
| Small pilot, no line-type scrub. 50 stores, 15% wireless, 2 attempts each | 15 | $7,500 | $22,500 |
| Chicago rollout without scrub. 1,000 stores, 15% wireless [A], 2 attempts/month × 6 months | 1,800 | **$900,000** | **$2.7M** |
| Same rollout *with* a scrub that misses 2% of wireless numbers | 240 | $120,000 | $360,000 (willfulness is hard to show if the scrub was in good faith) |

These are **maxima, not predictions.** Likely real-world outcomes range from nothing (no one sues) to a demand letter settled for low thousands, to an individual small-claims or federal suit by one store owner. A class action is less likely, because store owners are a small, dispersed class and the calls are non-commercial. But the TCPA plaintiffs' bar does pursue small callers [I]. **The point of the table is that the downside is unbounded relative to a startup budget, and a line-type scrub plus exclusion policy cuts it by more than 90%.**

**Net:** **High risk without controls; moderate to low with a business-landline-only, scrubbed, disclosed, no-promotion design and a counsel opinion [I].**

### 1.5 Live audio processing, recording, transcripts, structured outcomes, AI disclosure

- **Illinois eavesdropping (720 ILCS 5/14-1, 14-2) [V/S]:** after the 2014 rewrite (P.A. 98-1142), the offense requires conduct done **"in a surreptitious manner"** (defined in §14-1 as by stealth, deception, secrecy, or concealment) involving a **"private conversation,"** meaning one where a party reasonably expects privacy. It requires the consent of all parties. Penalty: Class 4 felony for a first offense. Civil remedies (§14-6): injunction, **actual and punitive damages**. The earlier repo claim of a "$10,000 per violation" statutory figure was **not found** in §14-6 (register L7).
- **Two independent defenses [I]:** (1) a clerk quoting a shelf price to an unknown caller plausibly has no reasonable expectation of privacy; (2) a clear up-front statement ("this call is automated and may be transcribed") removes surreptitiousness. **Rely on (2), not (1).** Proceed only after an affirmative response, and log the disclosure timestamp.
- **Does turning off retention eliminate the issue? No [I].** A live speech-to-text model necessarily *processes* (and, transiently, transcribes) the audio. "Transcribe" is one of the statute's verbs for electronic communications. Not storing an MP3 reduces *breach* and *BIPA* exposure and the volume of discoverable data. It does **not** remove the need to make the call non-surreptitious. Federal wiretap law (18 U.S.C. §2511(2)(d)) is one-party consent, and the caller is a party, so the binding constraint is Illinois law and other all-party states (CA, FL, PA, WA, MD, MA, and others).
- **BIPA (740 ILCS 14) [S]:** "voiceprint" is undefined. Courts have used a dictionary meaning: a pattern *used to identify an individual speaker*. Several voice cases have been dismissed for failing to plead that a voiceprint was actually created (McDonald's drive-thru, Amazon/Pindrop). Others survived (Meta). New suits target AI transcription with *speaker recognition* (Otter.ai, Fireflies, 2025) [S: ABA, Bloomberg Law, Biometric Update]. The Aug 2024 amendment (SB 2979) limits recovery to one per person rather than per scan [I from memory; verify]. Liquidated damages are $1,000 (negligent) / $5,000 (reckless).
  - **Control:** use no speaker identification, diarization profiles, or voice cloning of respondents; keep no audio; and get vendor terms confirming ElevenLabs does not create speaker templates or train on call audio (check ElevenLabs' DPA and zero-retention options; note that batch calling is incompatible with Zero Retention Mode per ElevenLabs docs).
- **Structured outcomes:** a price, a yes/no on whether ZYN is carried, and deal terms are business facts, not personal data. Do **not** capture the respondent's name or any personal detail. The existing schema already avoids this.
- **AI identity disclosure:** required in substance by 64.1200(b) (identity of the calling business) and the Illinois ATDA consent inquiry, and pending at the FCC [V/S/?]. Beyond legality, an *undisclosed* AI caller asking about a nicotine product is the worst possible fact pattern for a regulator's press release. **The "normal 25-year-old guy" persona stays rejected.**
- **Net:** **Moderate risk; manageable with disclosure, no recording, no speaker identification, and vendor terms.**

### 1.6 Ads, sponsored placements, affiliate links, commissions

- **FTC Endorsement Guides (16 CFR Part 255, revised 2023) and FTC Act §5 [S]:** a "material connection" (commission, payment, free product) between NicFinder and a merchant or store must be disclosed **clearly and conspicuously**: close to the link or placement, in plain words ("We earn a commission if you buy through this link"), not buried in a footer. Sponsored placements in a ranked list must be visibly labeled "Sponsored" and must not be presented as the neutral "cheapest" result [I]. Paying for reviews or suppressing negative reports falls under the 2024 Reviews Rule (§1.2).
- **FDA [V/I]:**
  - Advertising for ZYN and other covered tobacco products must carry the required nicotine addictiveness warning (21 CFR Part 1143). The duty sits on the manufacturer, distributor, or retailer who disseminates or causes the ad, not on an independent publisher, *but* running non-compliant creative invites trouble and platform bans [I; 1143 text not retrieved this session].
  - PMI's ZYN marketing orders impose 21+ targeting and other restrictions on **PMI's** marketing [S: FDA press release, Jan 16, 2025]. A publisher accepting PMI money for ZYN promotion would be part of PMI's marketing program and bound by its constraints in practice.
  - **"Modified risk" claims:** saying or implying a product is safer than cigarettes in *advertising or labeling* requires an FDA MRTP order (21 U.S.C. §387k). Editorial content is different, but **never put "safer"/"healthier" language near commercial links** [I].
- **Does an affiliate link make NicFinder a "seller"? Probably not under federal law [I].** The PACT Act (15 U.S.C. §375 et seq.) and its delivery-sale duties (age verification at delivery, state registration, excise tax) bind the *delivery seller*. As of the 2010 amendments and the 2022 synthetic-nicotine expansion, cigarettes and smokeless tobacco are covered; whether nicotine pouches count as "smokeless tobacco" under the PACT Act is itself contested [?]. But **state law is the risk**. Several states restrict or ban internet or delivery sales of tobacco or nicotine products, or ban flavored products (e.g., Massachusetts and California flavor bans that reach flavored pouches [S/?]). Advertising those sales into such states, for a commission, could be framed as aiding or advertising an unlawful sale [?]. **Mitigation:** geofence affiliate offers to states where the merchant lawfully ships (merchants publish shipping-restriction lists), and get the merchant's written warranty of compliance.
- **Retailer-paid sponsorships:** retailer advertising of tobacco is lawful within Part 1140 and state limits. Retailers bear the duty for their own ad content. NicFinder should contractually require accurate, compliant sponsor content and keep the right to reject it [I].
- **Manufacturer money:** keep it off-limits at launch (business-doc recommendation; agreed). It invites FDA and state AG scrutiny and destroys perceived neutrality.
- **Net:** **Moderate risk, mostly reputational and platform-related; legal risk is manageable with disclosure, geofencing, and contracts.** See Phase 3 for the commercial side.

### 1.7 Operating an adult-only site nationwide: geolocation, accounts, privacy, cookies, analytics, moderation, retention

- **Age gate:** no state law found requiring *ID-based* age verification for nicotine *information* sites. The 2023–25 wave of state age-verification laws (e.g., Texas HB 1181) targets sexual material online [I; not exhaustively surveyed]. Tobacco *online sales* laws do require age verification, but those apply to sellers. A 21+ self-attestation gate is the industry norm [I]. The app already has a gate; keep it as an overlay for crawlability (DECISIONS #20). **COPPA (15 U.S.C. §6501):** applies only to sites directed to under-13s or with actual knowledge of collecting their data. Avoid youth appeal and delete accounts on knowledge of an under-21 user [I].
- **Comprehensive state privacy laws:** **Illinois has no comprehensive consumer-privacy statute as of our research [I; confirm; bills recur]**. About 19–20 states do (CA, VA, CO, CT, UT, TX, OR, MT, IA, IN, TN, DE, NH, NJ, KY, NE, MD, MN, RI). Most apply only above thresholds (typically 100,000 state residents' data per year, or 25,000 plus data-sale revenue). California's CCPA also uses a ~$25M+ revenue test (CPI-adjusted). **Texas and Nebraska** exempt *small businesses* by SBA definition rather than by volume, but still require consent before *selling sensitive data* [S/I]. **Precise geolocation is "sensitive data"** under many of these laws [S].
  - **At pilot scale, NicFinder is very likely below every threshold [I]**, but design as if covered: process browser geolocation in the browser or ephemerally and don't store it; store only ZIP-level searches; never sell user data; honor deletion requests.
- **Cookies and analytics:** no general US cookie-consent law. CCPA requires a "Do Not Sell or Share" mechanism once covered, and ad-tech pixels can count as "sharing." Use privacy-friendly analytics; the app's hashed-IP approach is good [I].
- **Illinois Personal Information Protection Act (815 ILCS 530):** data-breach notification and "reasonable security" duties for personal information. Covered data includes an email/username *plus password* [S/I]. The app's scrypt hashing is appropriate. Have a breach-response note in the runbook.
- **Accessibility:** ADA Title III's application to websites is unsettled nationally. Some Seventh Circuit precedent reads Title III without a physical-place nexus (e.g., *Doe v. Mutual of Omaha*, 7th Cir. 1999 dicta), which raises the website-coverage risk for an Illinois operator [I]. Target **WCAG 2.1 AA** (the DOJ's 2024 Title II standard) as a cheap hedge against serial demand letters.
- **Moderation and retention:** publish a short retention schedule. Suggestions: delete raw call transcripts after QA (e.g., 30–90 days) unless needed for a dispute; keep structured observations indefinitely; delete account data on request; keep the audit log [I].
- **Net:** **Low risk at pilot scale; needs a real privacy review before 100k users, B2B data sales that include user-derived data, or any ad-tech.**

---

## 2. Seller vs. non-selling information site

| Duty | Seller (store or online retailer) | NicFinder as information site | Changes if NicFinder… |
|---|---|---|---|
| Tobacco retail license (IL/Chicago) | Required | Not required [I] | …takes orders, payment, or reservations ("reserve a can at Store X") |
| Age verification of buyers | Required at sale (21+) | Self-attestation gate is the norm [I] | …facilitates transactions |
| PACT Act / delivery-sale rules | Delivery sellers | Not applicable [I] | …ships or arranges shipment |
| FDA Part 1140 advertising rules | Retailers/manufacturers | Not directly [V/I] | …accepts manufacturer ad money or runs ads as the retailer's agent |
| Excise tax | Distributors/retailers | None | — |
| FTC disclosure | Any advertiser | Applies once paid relationships exist [S] | …adds affiliate links or sponsorships |
| State flavor bans | Sellers into those states | Not directly | …promotes flavored products for sale into ban states via affiliate links [?] |

**Bright lines that keep NicFinder an information site [I]:** no checkout, no payment, no reservations or holds, no delivery coordination, no coupons redeemable for nicotine products issued by NicFinder, and no manufacturer-funded promotions. Affiliate links sit at the boundary. They are probably fine with disclosure and geofencing, but they are the activity most likely to change a regulator's characterization.

---

## 3. Defamation, false prices, retailer disputes

- **Illinois commercial disparagement / trade libel [I; elements from common law]:** a false statement about a business's goods or services, published to others, causing pecuniary harm. Some Illinois cases require malice-type fault for certain claims. A wrong *price* (e.g., showing $11.99 when the store charges $8.49) could deter customers. That is a theoretically actionable but **low-dollar** harm, hard to prove, and almost always resolved by correction.
- **Defamation per se** is unlikely from a price alone. More likely sources are comments ("this store sells to minors"). That is a UGC issue, covered by Section 230 if user-generated, but moderate it anyway.
- **Controls:** (1) date and source on every price ("phone-reported Oct 28", "user-reported, 2 confirmations"); (2) **a 48-hour correction SLA** for store-owner disputes, with a "store disputes this price" state; (3) never call a store "overpriced" or "ripoff" in your own voice, since neutral numbers are safer than adjectives; (4) a plain disclaimer that shelf, register, and tax-inclusive prices can differ.
- **Store opt-out requests:** you are generally not obligated to remove accurate factual listings [I]. Recommended policy: remove a store's *phone number* or exclude it from calls on request; **keep accurate prices**, but correct promptly when shown evidence. Counsel should bless the written policy.

## 4. Intellectual property: ZYN and the NicFinder name

- **Nominative fair use [I; doctrine]:** using "ZYN" in text to identify the product being priced is classic nominative use (*New Kids on the Block v. News America*, 9th Cir. 1992; *Toyota v. Tabari*, 9th Cir. 2010). The Seventh Circuit has not formally adopted the New Kids test and applies ordinary likelihood-of-confusion analysis, which leads to similar outcomes for plain-text references.
- **Risk factors:** "ZYN" in the **domain** (zynprices.com, zynfinder.com, etc.) creates UDRP and cease-and-desist risk and is the classic overreach. So do the stylized ZYN logo, PMI's can imagery, and any suggestion of endorsement. **Current brand "NicFinder" avoids this. Keep it.**
- **Controls:** text-only references, a footer disclaimer ("ZYN is a trademark of its owner; NicFinder is not affiliated with or endorsed by Philip Morris International or Swedish Match"), no product photos you don't own, and no "official" language.
- **NicFinder clearance:** a USPTO search was **not performed** this session (TESS was retired in 2023 in favor of the new trademark search system, which needs interactive access). Before buying a domain or registering the mark: run a knockout search (USPTO search, state marks, common-law web search) and consider filing in Class 35 (price-comparison services) / Class 42 [I].
- **Software IP:** the founder should own the code. If any contractor or AI-tooling terms apply, confirm assignment (Phase 2).

## 5. Data licensing (the quiet risk)

- **Google Places:** Google's Maps Platform Service Specific Terms historically barred using Places content with a non-Google map and capped caching (lat/lng up to 30 days). The **2024 versions allow use "without a Google Map,"** but caching remains restricted except `place_id` [S: Google terms archive versions 2018-10-15, 2024-04-22, 2024-05-22]. **If any seeded store names, addresses, or phones were harvested from Google Maps or the Places API, storing and republishing them long-term likely conflicts with the terms [I].** That is a contract issue (API key termination), not a lawsuit risk at this scale. **Fix:** re-source the directory from (a) the **Chicago Data Portal business-license dataset** (open data; tobacco retail license holders), (b) **OpenStreetMap** under ODbL with attribution, or (c) store-confirmed details.
- **OpenStreetMap ODbL:** attribution is required. If you publicly use a *derivative database* (e.g., OSM store records plus your corrections), share-alike can require offering that derivative under ODbL. Your **independently collected price data** can likely be kept as a separate "collective" database, but structure this deliberately and have counsel glance at it [I].
- **ZIP centroid data (GeoNames, CC BY 4.0):** attribution only. The app already credits it (DECISIONS #8).
- **B2B resale:** you can sell *your own* price observations. You cannot resell Google-derived or vendor-licensed store attributes. Another reason to clean up provenance before Phase 3's B2B plan.

## 6. Cybersecurity and recordkeeping

- **Recordkeeping (if calling is ever approved):** per call, keep the line-type lookup result and timestamp, the disclosure played, the consent response, the opt-out status, call time in Central time, and the agent and prompt version. The TCPA limitations period is generally **4 years** (28 U.S.C. §1658), so keep calling compliance records ≥4 years even if transcripts are deleted [I].
- **Security baseline:** secrets in a manager (DECISIONS notes old workbook credentials should be rotated: **do this**), webhook HMAC verification, least-privilege Twilio keys, no audio storage, and breach-response steps (IL PIPA).

---

## 7. Risk matrix

Likelihood and severity use 1–5 scales [A]. "Counsel?" means qualified legal advice is recommended before the activity starts.

| # | Activity | Jurisdiction | Controlling source (effective) | Likelihood | Severity | Mitigating control | Confidence | Counsel? |
|---|---|---|---|---|---|---|---|---|
| R1 | AI-voice calls reach wireless/mixed-use numbers | Federal | 47 U.S.C. §227(b)(1)(A)(iii), (b)(3); FCC 24-17 (Feb 8, 2024) | 4 without scrub / 1–2 with scrub | 5 ($500–1,500/call, uncapped) | Line-type scrub before every batch; exclude wireless/unknown/non-fixed VoIP; consent pathway only via written opt-in | High | **Yes, mandatory** |
| R2 | AI-voice calls to residential lines | Federal | §227(b)(1)(B); 64.1200(a)(3) (July 20, 2023) | 2 | 3 | Exclude residential-typed numbers | High | Yes |
| R3 | Missing identification / callback number in AI call | Federal | 47 CFR 64.1200(b) | 2 | 3 | Disclosure-first script; logged per call | High | Yes (script review) |
| R4 | Promotional content in data calls, turning them into telemarketing | Federal + IL | §227(b) PEWC; TSR 16 CFR 310 (B2B amendments May 16, 2024); 815 ILCS 413 | 2 | 4 | Bright-line "no promotion" script rule; separate human-only sales outreach | High | Yes |
| R5 | Autodialer calls without consent inquiry / outside hours | Illinois | 815 ILCS 305 §15 | 2 | 3 [?] | Consent question at start; 10:00–17:00 CT window | Medium | **Yes** |
| R6 | Surreptitious recording or transcription | Illinois (+ other all-party states) | 720 ILCS 5/14-2, 14-6 (P.A. 98-1142, Dec 30, 2014) | 2 | 4 (felony; civil actual + punitive) | Up-front disclosure + affirmative continue; no audio retention | Medium-High | **Yes** |
| R7 | Voiceprint creation via speaker ID/analytics | Illinois | BIPA 740 ILCS 14 (SB 2979 Aug 2, 2024) | 1–2 | 3–4 | No diarization/speaker ID; no audio; vendor DPA | Medium | Yes (vendor terms) |
| R8 | Undisclosed affiliate/sponsor relationships | Federal + IL | FTC Act §5; 16 CFR 255 (2023); 815 ILCS 505 | 2 | 3 | Inline disclosures; "Sponsored" labels; neutral ranking separate | High | Light review |
| R9 | Fake/incentivized reviews or suppressed reports | Federal | 16 CFR 465 (Oct 21, 2024) | 1 | 4 (≈$53k/violation if knowing) | Reward accuracy only; never let sponsors edit others' data | High | No (policy) |
| R10 | "Verified" label on unverified AI-extracted price | Federal + IL | FTC Act §5; 815 ILCS 505 | 3 | 2–3 | Use literal labels ("phone-reported", "user-confirmed ×3"); define "verified" publicly | High | Light review |
| R11 | Wrong price about a named store | Illinois common law | Commercial disparagement | 2 | 1–2 | Dates, sources, 48h correction SLA, dispute state | Medium | Policy review |
| R12 | Affiliate offers into states restricting online/flavored nicotine sales | Multi-state | State delivery-sale and flavor laws (vary); PACT Act (seller) | 2 | 2–3 | Geofence offers by merchant's ship list; merchant compliance warranty | Low-Medium | **Yes** (before affiliate launch) |
| R13 | Manufacturer-paid ads without warnings / youth appeal | Federal + states | 21 CFR 1140/1143; PMI marketing orders; AG authority | 1 (if refused) | 4 | Refuse manufacturer money at launch | High | Yes if ever considered |
| R14 | ZYN mark in domain/logo | Federal | Lanham Act; UDRP | 1 (current brand) | 2 | Text-only nominative use; disclaimer | High | No |
| R15 | Google-derived store data stored long-term | Contract | Google Maps Platform ToS (2024 versions) | 3 [?] | 1–2 (key termination, data purge) | Re-source from Chicago Data Portal/OSM | Medium | No |
| R16 | Privacy-law applicability (geolocation, analytics) | Multi-state | ~19 state privacy acts (various dates) | 1 at pilot / 3 at scale | 2–3 | Ephemeral geolocation; no data sales; thresholds monitored | Medium | At 50k+ MAU |
| R17 | Breach of account data | Illinois | 815 ILCS 530 | 1–2 | 2 | scrypt hashes, minimal PII, response plan | High | No |
| R18 | Website accessibility demand letter | Federal (7th Cir.) | ADA Title III (unsettled) | 2 | 2 | WCAG 2.1 AA | Medium | No |
| R19 | Youth-appealing content triggers AG attention | States/IL AG | UDAP + tobacco youth-access statutes | 1 | 3 | Conservative copy; no college-party/“deal for students” marketing | Medium | Copy review |
| R20 | Founder personal liability for calling violations | Federal | TCPA individual-participation case law | Tied to R1 | 5 | Don't run calling without counsel opinion; insurance won't cover TCPA (usually excluded) | Medium | **Yes** |

**Concentration of risk:** R1, R4, R5, R6, and R20 are all about the calling program. Remove the calling program and the matrix reduces to a manageable checklist.

---

## 8. Insurance note (preview of Phase 2)
Standard general-liability and many cyber/media policies **exclude TCPA claims** and statutory-damages claims [S; widely reported industry practice]. Do not assume insurance will backstop a calling mistake. Media/E&O coverage can respond to defamation or trade-libel claims over published content.

## 9. State-by-state expansion framework

Before entering a new state, answer six questions (one-page memo per state):

1. **Calling:** does the state have a mini-TCPA or autodialer statute? Does it reach *non-solicitation* automated calls? What are its hour windows, consent and identification wording, and registration? (Watch: FL, OK, WA, MD, NJ, TX, IN, WI.)
2. **Recording:** is it an all-party-consent state? (CA, FL, IL, MD, MA, MT, NH, PA, WA; others are one-party.) A disclosed-call design works everywhere, but confirm.
3. **Nicotine sales law:** flavor bans (e.g., MA, CA), delivery-sale bans, and local pouch restrictions. These affect *affiliate links* and content, not the directory itself.
4. **Taxes:** excise regime (for the "why prices differ" explainer, and dispersion potential in Phase 6).
5. **Privacy:** does the state's privacy law have thresholds NicFinder might hit?
6. **Biometric/voice:** BIPA-like laws (IL, TX CUBI, WA) and any AI-disclosure statutes for bots (e.g., California's B.O.T. Act, Cal. Bus. & Prof. Code §17940, which covers bots used to incentivize sales or influence votes; generally not a price inquiry, but disclosure moots it).

**Indiana and Wisconsin** are the natural Chicago-adjacent extensions. Both are one-party-consent states for recording [I; confirm]. Indiana has an autodialer statute (Ind. Code 24-5-14) that historically **restricted automated dialing broadly, with narrow exceptions** [I; strong recollection, verify]. **Do not extend calling to Indiana without an Indiana-specific opinion.** A manual or community collection model has no such issue.

---

## 10. Questions for counsel

### A. TCPA / telecom / advertising lawyer (Illinois-experienced)
1. Post-*McLaughlin* (2025), how do Seventh Circuit district courts treat FCC 24-17 when deciding whether an interactive LLM voice is an "artificial voice"? Should we assume it is?
2. Confirm that §227(b) imposes no consent requirement for non-telemarketing artificial-voice calls to *business landlines*. How should fixed VoIP and "business wireless" lines be treated?
3. What line-type data source and refresh cadence is a defensible standard of care? Is excluding "unknown" sufficient?
4. Does publicly listing a cell number as a store's phone number create any implied consent? (We assume no.)
5. Does 815 ILCS 305 apply to an interactive AI agent? What are §30's penalties and private-action provisions? Is "is that okay?" an adequate consent inquiry?
6. What exact disclosure wording do you approve? Must the callback number be spoken, and where in the call?
7. Under 720 ILCS 5/14, does an up-front "automated, may be transcribed" disclosure plus continued participation constitute consent? Is real-time ASR with no retention still "transcribing"?
8. Is a pure price-inquiry call "telemarketing" under the TSR or a "solicitation" under 815 ILCS 413 if the business could later be offered paid listings by *separate* human outreach?
9. Would you write an opinion letter for a ≤50-store business-landline pilot? What would it cost?
10. Individual liability: what is the founder's personal exposure in the Seventh Circuit, and what governance steps reduce it?
11. Affiliate links to online nicotine retailers: any aiding/advertising exposure for states with delivery-sale or flavor bans? Do we need to geofence?
12. Review our "Sponsored" label, affiliate disclosure, and the definition behind any "verified" badge.

### B. Privacy / business lawyer
1. Review the terms of use, privacy policy, retention schedule, and correction/takedown policy.
2. Which state privacy laws could apply first as traffic grows? What changes at 50k/100k MAU?
3. Is browser geolocation that never leaves the device (or is used once and discarded) "processing precise geolocation"?
4. BIPA posture for any vendor that processes call audio; required vendor contract terms.
5. Data licensing: is our store directory clean (Google vs. OSM/Chicago open data)? ODbL share-alike implications for a B2B dataset.
6. Section 230 posture for community reports with corroboration badges. How should we word labels?
7. Trademark clearance for "NicFinder" and filing strategy.

---

## 11. Prelaunch checklist and staged compliance gates

### Gate 0 — Launch the informational site (no calling)  ✅ *can start now*
- [ ] 21+ overlay gate (exists); under-21 exit; no youth-appeal content
- [ ] Every price shows source type + date; "verified" only where literally true, with a public definition
- [ ] Terms of use (incl. user-content license, prohibited content, no-naming-employees rule) and privacy policy (geolocation handling, retention, deletion)
- [ ] Correction/dispute policy with a 48h SLA and a "store disputes this price" state
- [ ] Trademark disclaimer; text-only ZYN references; brand not containing "ZYN"
- [ ] Store directory provenance cleaned (Chicago Data Portal / OSM with attribution); remove any Google-cached fields
- [ ] Rotate any credentials from the old workbook (DECISIONS #3)
- [ ] WCAG 2.1 AA pass on core pages
- [ ] Manual price collection only: in-person observation or **human** calls that identify NicFinder, no recording

### Gate 1 — Monetization (after a ~1–3 hour lawyer review)
- [ ] Affiliate agreement reviewed; inline disclosures; geofence to merchant's lawful ship states; merchant compliance warranty
- [ ] "Sponsored" visual standard; neutral price ranking never altered by payment
- [ ] No manufacturer money

### Gate 2 — Automated-calling *test* (only after a written counsel opinion and explicit founder authorization)
- [ ] Opinion covers items A1–A10
- [ ] Twilio Trust Hub Business Profile + SHAKEN/STIR; CNAM "NicFinder"; real callback number staffed or with voicemail
- [ ] Line-type scrub policy implemented; exclusion of wireless/unknown/non-fixed VoIP/residential
- [ ] Disclosure-first script approved verbatim; consent question; no promotion
- [ ] No audio recording; no speaker ID; vendor DPA reviewed; transcript retention ≤90 days
- [ ] Suppression list honored before every batch; calling window 10:00–17:00 CT
- [ ] First test only to **consenting** numbers (owned phones, stores that opted in in writing)

### Gate 3 — Scaled calling (after the Phase 4 experiment meets go criteria)
- [ ] Complaint rate, opt-out rate, and spam-label checks within thresholds
- [ ] Per-state memo before any non-Illinois destination
- [ ] Annual re-check of FCC docket 23-362 and Illinois statutes

### Never (without a fundamental re-review)
- Undisclosed AI or human-persona impersonation; calls to unscrubbed lists; promotional content in data calls; checkout/reservations/delivery; manufacturer-funded promotion; marketing aimed at under-21 audiences (including college-party framing).

---

## 12. What would change this assessment
- A final FCC AI-disclosure rule with consent requirements for *all* AI calls, including business lines → calling becomes impractical. Move to manual and partner data.
- Counsel says 815 ILCS 305 bars autodialed recorded/AI calls to Illinois businesses without prior consent → the Illinois calling program is dead, regardless of federal law.
- Evidence that a large share (>30%) of Chicago c-store listed numbers are wireless → calling coverage collapses even if it is legal (Phase 5 economics).
- A state AG action against a nicotine *information* site → raise the age-verification and content posture.

## Sources (accessed 2026-11-04)
- FCC AI NPRM / declaratory ruling summary — Federal Register 2024-19028 (Sept 10, 2024): https://www.federalregister.gov/documents/2024/09/10/2024-19028/implications-of-artificial-intelligence-technologies-on-protecting-consumers-from-unwanted-robocalls
- Status of AI-disclosure rules (secondary, 2026): https://www.zian.ai/fcc-nprm-24-84-ai-call-disclosure-rules/ ; https://justcall.io/blog/ai-voice-agent-disclosure-laws.html
- Residential prerecorded-call limits effective July 20, 2023 — 88 FR (Jan 20, 2023): https://www.govinfo.gov/content/pkg/FR-2023-01-20/html/2023-00634.htm ; Wiley alert: https://www.wiley.law/alert-New-TCPA-Rules-For-Some-Exempt-Calls-Will-Go-Into-Effect-on-July-20-2023
- TCPA consent primer (TCPAWorld, Apr 7, 2025): https://tcpaworld.com/2025/04/07/tcpa-consent-primer-here-are-the-basics-of-the-tcpas-requirements-for-consent-for-various-types-of-calls/
- 47 CFR 64.1200 (2021 CFR text): https://www.govinfo.gov/content/pkg/CFR-2021-title47-vol3/pdf/CFR-2021-title47-vol3-sec64-1200.pdf (check current eCFR before reliance)
- *McLaughlin Chiropractic v. McKesson* (June 20, 2025): https://www.manatt.com/insights/newsletters/client-alert/mclaughlin-v-mckesson-what-the-supreme-court-s-decision-means-for-tcpa-litigation-compliance ; https://www.faegredrinker.com/en/insights/publications/2025/6/supreme-court-decides-mclaughlin-chiropractic-associates-v-mckesson-corp
- Lingo Telecom $1M consent decree (Aug 2024): https://therecord.media/telecom-company-fined-1-million-biden-ai-robocalls ; https://cyberscoop.com/telecom-behind-ai-powered-biden-robocall-agrees-to-1-million-fcc-fine/
- TSR B2B amendments (89 FR, Apr 16, 2024): https://www.govinfo.gov/content/pkg/FR-2024-04-16/pdf/2024-07182.pdf ; Husch Blackwell summary: https://www.huschblackwell.com/newsandinsights/ftc-amends-telemarketing-sales-rule-to-increase-recordkeeping-requirements-and-cover-business-to-business-telemarketing-calls
- 720 ILCS 5/14-6: https://ilga.gov/legislation/ilcs/documents/072000050K14-6.htm ; 720 ILCS 5/14-2: https://www.ilga.gov/Documents/legislation/ilcs/documents/072000050K14-2.htm ; P.A. 98-1142: https://www.ilga.gov/Legislation/publicacts/view/098-1142
- 815 ILCS 305 (text as reproduced in 101st GA bills): https://www.ilga.gov/legislation/101/HB/10100HB0337.htm ; https://law.justia.com/codes/illinois/chapter-815/act-815-ilcs-305/
- 815 ILCS 413 (Telephone Solicitations Act): https://law.justia.com/codes/illinois/2010/chapter815/2349.html
- BIPA voiceprint litigation: ABA (2024): https://www.americanbar.org/groups/litigation/resources/newsletters/class-actions-derivative-suits/voiceprints-ai-bipa-new-trends-biometric-privacy-litigation/ ; Meta (Aug 2026): https://www.biometricupdate.com/202608/meta-loses-bid-to-end-bipa-voiceprint-suit-as-case-moves-forward ; Otter.ai: https://news.bloomberglaw.com/artificial-intelligence/otter-ai-hit-with-bipa-class-suit-over-voice-print-collection ; Carpenter v. McDonald's: https://caselaw.findlaw.com/court/us-dis-crt-n-d-ill-eas-div/2167709.html
- IDOR Informational Bulletin FY 2025-31 (45% / pouches / license fee): https://tax.illinois.gov/research/publications/bulletins/fy-2025-31.html ; 86 Ill. Adm. Code 660.170: https://ilga.gov/commission/jcar/admincode/086/086006600000170R.html
- Cook County 2013 tobacco notice: https://www.cookcountyil.gov/sites/g/files/ywwepo161/files/service/noticeofthecookcountytobaccoordinancechanges.pdf
- 21 CFR 1140 (2025 CFR): https://www.govinfo.gov/content/pkg/CFR-2025-title21-vol8/pdf/CFR-2025-title21-vol8-sec1140-2.pdf
- FDA ZYN authorization (Jan 16, 2025): https://www.fda.gov/news-events/press-announcements/fda-authorizes-marketing-20-zyn-nicotine-pouch-products-after-extensive-scientific-review
- FTC Consumer Reviews and Testimonials Rule (effective Oct 21, 2024): https://dwt.com/insights/2024/08/ftc-finalizes-rule-banning-fake-consumer-reviews ; https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-finalizes-rule-on-fake-reviews
- Section 230 and review aggregates: https://blog.ericgoldman.org/?p=17437 (Icon Health v. ConsumerAffairs) ; https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ninth-circuit-holds-yelp-is-not-responsible-for-bad-reviews
- Google Maps Platform Service Specific Terms (versions): https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20181015 ; https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20240422 ; https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20240522

**Not verified this session (flagged in text):** current eCFR wording of 64.1200(b)(2)–(3); 815 ILCS 305 §30 penalties; BIPA SB 2979 details; 21 CFR 1143 text; Indiana Code 24-5-14 current scope; state flavor/delivery-sale lists; the list of comprehensive-privacy states (from background knowledge, ~2025). Each is marked [?] or [I] where used.
