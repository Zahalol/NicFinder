# 02 — Business and Entity Structure

**Prepared:** 2026-11-04 · **Phase 2 of 7** · Research only; **not legal or tax advice**. Fee figures are labeled by source quality: **[V]** official or primary · **[S]** consistent across multiple secondary sources · **[S1]** single secondary source or conflicting sources · **[A]** assumption · **[M]** from the researcher's background knowledge (pre-2026), verify before acting.
**Assumed facts:** solo founder; lives in Chicago; owns the software and concept; little or no revenue at first; later advertising, affiliate, and B2B data revenue; possible automated-calling pilot later (Phase 1 shows it is the dominant liability).

---

## Recommendation in one paragraph

**Form a single-member Illinois LLC before public launch.** That means before real store names and prices go live with user content, and before signing any affiliate, advertising, or data agreement. Keep the default tax treatment (a "disregarded entity", taxed on your personal return). **Do not form in Delaware now.** For a solo, Illinois-based, pre-revenue company, a Delaware LLC adds about $300 a year in Delaware tax, an Illinois foreign registration, and a second registered agent, and buys nothing a court in Illinois would honor differently. **Revisit the structure only on a specific trigger:** (a) a priced equity round from angels or VCs, at which point convert to a **Delaware C-corp**; (b) steady net profit above roughly $50–60k a year, at which point evaluate an S-corp election; or (c) a cofounder joining, at which point you need an operating agreement with vesting, or a conversion. **An LLC does not protect you from your own unlawful calling.** Its value is shielding personal assets from *contract* and *ordinary business* claims, and signaling professionalism to merchants and data buyers.

---

## 1. Entity options compared

| Factor | Sole proprietorship | **Illinois LLC** | Delaware LLC registered in Illinois | Delaware C-corp (later) |
|---|---|---|---|---|
| Formation cost | $0 (Chicago license still applies) | **$150** Articles of Organization (+$100 expedited) [S] | ~$110 DE formation [M] + **$150** IL foreign admission (Form LLC-45.5) [S] + DE registered agent ~$50–300/yr [S1] | ~$89+ DE incorporation [M] + IL foreign registration + franchise tax and annual report |
| Annual state cost | $0 | **$75** IL annual report [S] | **$300** DE annual tax [S] + **$75** IL annual report [S] + DE agent | DE franchise tax (≥$400 with the assumed-par method) [M] + IL annual report and IL franchise tax |
| Liability shield | None | Yes, for entity debts and contracts; **not** for your own torts or statutory violations you personally commit | Same as IL LLC | Same principle |
| Tax default | Schedule C; 15.3% self-employment tax on net earnings [M] | Same (disregarded) | Same (disregarded) | Double taxation (21% federal corporate + IL 7% + 2.5% replacement tax [M]) unless profits are reinvested |
| Investor friendliness | None | Low (angels tolerate; VCs don't) | Low to moderate | **High** (SAFEs, preferred stock, option pools) |
| QSBS (§1202) eligibility | No | No | No | **Yes**, for stock originally issued by a C-corp [M] |
| Admin burden | Minimal | Low | Medium (two states) | High (board, minutes, 83(b) elections, payroll if officers are paid) |
| When it makes sense | Hobby / pre-launch prototyping | **Now → product–market fit** | Rarely, for a solo Illinois operator | At the first priced round, or when VC is the plan |

**Why Delaware doesn't help now [I]:** Delaware's advantages are its Court of Chancery and a well-developed body of corporate case law. Those matter for multi-owner companies with investor disputes. A one-person LLC operating entirely in Illinois will be sued in Illinois, under Illinois tort law, by Illinois plaintiffs, and must register in Illinois anyway. The founder pays two sets of fees for no practical benefit. If VC money arrives, converting an Illinois LLC into a Delaware C-corp is a routine filing (statutory conversion or merger), typically $1.5–5k in legal fees [A], and the investor's lawyers will usually want to control that process anyway.

**Illinois Series LLC** ($400 [S]): no benefit at this stage. Ignore it.

## 2. When to incorporate: specific triggers

| Milestone | Form the LLC? | Reasoning |
|---|---|---|
| Building privately, demo data only | Optional | Nothing is published about real stores and there are no contracts yet. |
| **Public launch with real store names, prices, and UGC** | **Yes, before this** | This is the first point where a third party (a store owner, a user) has a plausible claim. $150 is cheap insurance, and media/cyber insurance usually wants a business entity. |
| Collecting any money (ads, affiliate, donations) | **Yes** | Separate bank account; payments in the business's name; clean books. |
| Signing affiliate, ad network, or data agreements | **Yes** | Contracts should be signed by the LLC so contract liability stays with the LLC. Many affiliate networks ask for an EIN/W-9 anyway. |
| **Automated-calling pilot** | **Yes, plus a counsel opinion, plus a check on insurance limits** | The LLC is necessary but **not sufficient**. TCPA individual-participation liability can still reach the founder (Phase 1 §R20). The structural protections that actually matter are the counsel opinion, the scrubbing controls, and documented good faith. |
| First outside investor | Convert to a C-corp if the investor is institutional; an LLC is fine for a friends-and-family convertible note | — |

## 3. Setup checklist, now versus later

### Necessary now (before public launch) — total ≈ $150–$600 out of pocket [S/A]
1. **Name check** on the Illinois Secretary of State database. Ideally also run a basic trademark knockout search for "NicFinder" (Phase 1 §4).
2. **File Illinois Articles of Organization** online ($150 [S]). You can serve as your own **registered agent** at your Chicago address, but it becomes public record. A commercial agent costs about $50–150 a year [S1] and keeps your home address off filings.
3. **Single-member operating agreement.** Free template or about $300–800 with a lawyer [A]. It supports the liability shield by documenting the separation between you and the company.
4. **EIN** from the IRS (free, online, minutes) [M].
5. **Business bank account** in the LLC's name. **Never commingle funds.** Commingling is the most common reason courts pierce the veil and disregard an LLC [M].
6. **IP assignment:** a one-page agreement assigning the founder's pre-formation code, the "NicFinder" name, the domain, and the data to the LLC. This matters for any future sale (buyers diligence the IP chain of title).
7. **Chicago business license — OPEN QUESTION.** Chicago requires a license for home-based businesses [V: chicago.gov home-based business page]. **The fee is uncertain.** City pages show $250 for a home-occupation (Regulated Business) license. A 2026 third-party guide reports Regulated Business licenses rose to **$1,000** and Limited Business licenses to **$500** effective Jan 1, 2026 [S1], and a 2026 ordinance (O2026-0026292) amends home-occupation fees. **Action:** call BACP's Small Business Center and ask whether an internet-only information business run from home needs a Home Occupation license, which class, and the current fee. Budget **$250–1,000 per 2-year term** [S1].
8. **Bookkeeping:** a free or low-cost ledger (e.g., Wave free tier; QuickBooks or Xero about $20–40 a month [A]). Record founder-paid expenses as capital contributions.
9. **Terms of use, privacy policy, correction policy** (Phase 1 Gate 0). A template plus a one-time lawyer review costs about $500–1,500 [A].

### Before revenue or contracts
10. **Insurance quotes** (§6).
11. **W-9 / tax profile** with affiliate networks using the LLC's EIN.
12. **Separate payment processor account** in the LLC's name (watch processors' restricted-business lists: nicotine *sales* are restricted, *information* sites generally are not, but affiliate-heavy nicotine sites sometimes get flagged [I]).

### Before any automated-calling pilot
13. Counsel opinion (Phase 1 Gate 2).
14. Confirm insurance (most policies **exclude** TCPA/statutory damages).
15. Board-style written consent, even for a one-member LLC, documenting that the calling program was approved *after* counsel review. This is good-faith evidence on willfulness [I].

### Can wait
- An S-corp election, a Delaware conversion, a Series LLC, an assumed name (only needed if you operate under a brand that differs from the LLC's legal name; the Illinois LLC assumed-name fee is about $150 [S1]), and trademark registration (do this before meaningful spend on the brand; the USPTO base fee is roughly $350 per class under the 2025 fee schedule [M]).
- **FinCEN beneficial ownership (BOI) reporting: not required.** FinCEN's final rule (Aug 11, 2026) permanently exempts *domestic* reporting companies [S: Steptoe, Troutman, Adams and Reese alerts].

## 4. Taxes

| Topic | Treatment (verify with a CPA) |
|---|---|
| Federal income tax | A single-member LLC is disregarded by default, so profit goes on Schedule C of your Form 1040 [M]. |
| Self-employment tax | 15.3% on net SE earnings up to the Social Security wage base, then 2.9% Medicare [M]. |
| Illinois income tax | 4.95% flat on personal income [S]. **Personal property replacement tax:** 1.5% applies to partnership- and S-corp-taxed entities; a disregarded single-member LLC generally does not owe it at entity level [S/I; confirm]. |
| **S-corp election (Form 2553)** | Lets you pay yourself a "reasonable salary" (payroll taxes apply) and take the rest as distributions without SE tax. Costs: payroll service (~$500–1,200/yr [A]), separate 1120-S return (~$800–2,000/yr preparer [A]), **Illinois 1.5% replacement tax on S-corp income** [S], and unemployment insurance. **Rule of thumb [A]:** consider it only once net profit is consistently above about $50–60k a year. Below that, the savings rarely exceed the added costs. **Not now.** |
| Affiliate / ad revenue reporting | Networks issue Forms 1099-NEC or 1099-MISC. The 2025 federal tax law (P.L. 119-21) raised the 1099-NEC/MISC threshold from $600 to **$2,000** for payments after 2025, and restored the 1099-K threshold to $20,000 and 200 transactions [M; verify]. **All income is taxable regardless of whether a 1099 is issued.** |
| Sales tax on revenue | Illinois generally does not tax advertising or information *services* [M]. **Watch item:** if NicFinder sells **B2B access to an online database or dashboard** to customers in Chicago, the **Chicago Personal Property Lease Transaction Tax** treats remote software or database access as a "nonpossessory computer lease." The rate is **15% from Jan 1, 2026** (up from 11% in 2025 and 9% before that), and NicFinder, as the lessor, may need to register and collect [S: Sales Tax Institute, Anrok, EY tax news]. A **PDF report or custom analysis** is more likely treated as a non-taxable service. That distinction should be designed with a CPA *before* pricing B2B products (Phase 3). |
| Business expenses | Software, hosting, data, legal, insurance, part of a home office (if you qualify), and phone are deductible [M]. Keep receipts in the LLC's books. |
| Startup costs | Up to $5,000 deductible in year one; the rest amortized over 15 years [M]. |
| Interstate expansion | Selling B2B subscriptions or ads to customers in other states can create sales-tax nexus (economic thresholds, usually $100k in sales or 200 transactions per state [M]). Income-tax nexus for an LLC flows through to the owner, so it is minor at small scale. Revisit at about $100k in revenue. |

## 5. Personal-liability protection and its limits

What the LLC **does** protect [M/I]:
- Contract claims (an unpaid vendor, a breached affiliate agreement), as long as the LLC signed.
- Vicarious claims arising from the business's ordinary operations, *if* formalities are kept.

What it **does not** protect:
1. **Your own wrongful acts.** If you personally design and launch an unlawful calling campaign, TCPA plaintiffs can name you individually. Many courts recognize personal liability for officers who directly participated or authorized the calls [S/I; Phase 1 R20]. Similar logic applies to deceptive advertising under the FTC Act and Illinois Consumer Fraud Act for individuals with authority and participation.
2. **Criminal statutes** (Illinois eavesdropping is personal).
3. **Veil piercing:** commingled funds, no separate account, an undercapitalized entity, or using the LLC as an alter ego [M].
4. **Personal guarantees** (some vendors and processors require them).
5. **Insurance gaps:** an LLC with no assets and no insurance means a judgment creditor collects nothing from the LLC. That protects you only if (1)–(4) don't apply.

**Practical shield stack:** an LLC + a separate account + adequate insurance + a counsel opinion before calling + documented compliance controls. Each layer covers a different failure.

## 6. Insurance (quotes needed; ranges are indicative)

| Policy | What it covers here | Indicative annual premium | Notes |
|---|---|---|---|
| **Cyber liability** ($1M) | Breach response, notification, user-data incidents | **~$1,000–1,550** average small business [S: Insureon 2026 average ~$1,552; MoneyGeek benchmark ~$999 for $1M] | A tiny pre-revenue web business often prices lower [A] |
| **Media liability / E&O** | Defamation, trade libel, IP infringement claims from published content | ~$500–2,500 [A] | Often bundled with cyber or tech E&O; most relevant to a price-publishing site |
| General liability | Bodily injury/property damage (e.g., meeting a client) | ~$300–700 [A] | Low relevance for an online business; often required by B2B contracts |
| **TCPA coverage** | Robocall/statutory damages | **Usually excluded** | Specialty TCPA coverage exists but is expensive and underwritten heavily. Don't count on it. |

**Recommendation:** at public launch, get a bundled **cyber + media/tech E&O** quote (~$1–3k/yr [A]). Add GL only when a contract requires it.

## 7. Contracts the business will need

| Contract | Stage | Priority points |
|---|---|---|
| Terms of use | Launch | User-content license to NicFinder; prohibited content; accuracy disclaimer; limitation of liability; Illinois governing law; age 21+ representation |
| Privacy policy | Launch | Geolocation handling; analytics; retention; deletion; no sale of personal data |
| Correction/takedown policy | Launch | 48h SLA; evidence standard; what's removed vs. corrected |
| Affiliate agreements | Gate 1 | Merchant's compliance warranties (age verification, lawful ship-to states); cookie window; termination; payment terms |
| Sponsor/advertising IO | Gate 1 | "Sponsored" labeling rights; NicFinder's right to reject creative; no influence on neutral ranking; sponsor's content warranties |
| **B2B data license** | Phase 3 | Licensed use only; no resale; accuracy disclaimer; data provenance (only *your own* observations; Phase 1 §5) |
| Contractor/IP assignment | Any hire | Work-for-hire + assignment; confidentiality |
| Vendor DPAs | Before calling | ElevenLabs/Twilio data processing; retention; no training on call audio |

## 8. Investment, cofounders, and exit readiness

- **Angels:** a friends-and-family convertible note can go into an LLC, but **standard SAFEs assume a corporation** [M]. If the plan is to raise a seed round from professional angels or a fund, convert to a Delaware C-corp first.
- **QSBS (§1202):** potentially excludes a large gain on a sale of C-corp stock held more than 5 years. The 2025 tax law reportedly added a tiered 3/4/5-year schedule and raised the cap to $15M [M; verify]. The clock starts when **C-corp stock is issued**, so time spent as an LLC doesn't count (converting resets the start). **Trade-off:** converting early starts the clock but brings double-tax risk on profits and more admin. This matters only if a venture-scale exit is realistic, which Phase 3 suggests is unlikely. Don't optimize for it now.
- **Cofounder:** use a written operating agreement (or C-corp stock) with **4-year vesting and a 1-year cliff**, IP assignment, and a defined role. In an LLC, give cofounder equity as a *profits interest* (to avoid an immediate tax hit) [M]. In a C-corp, the cofounder needs a **timely 83(b) election** within 30 days.
- **Asset sale vs. equity sale:** small web and data businesses are most often sold as **asset sales** (domain, code, data, contracts) [I]. Buyers avoid inheriting unknown liabilities, which is especially relevant here because of possible calling-era TCPA claims. Since a single-member LLC is disregarded, a sale of its membership interest is taxed like an asset sale anyway [M]. Keep clean records of data provenance, consent and calling logs, and contracts. These are the core diligence items (detail in Phase 3 §9).
- **Strategic acquirer readiness** (an online nicotine retailer or data company): they will diligence (1) data provenance and licensing, (2) the calling compliance file, (3) traffic quality and age-gating, (4) the IP chain of title, and (5) revenue concentration. An Illinois LLC with clean books handles all five.

## 9. Estimated first-year and recurring costs (no calling program)

| Item | One-time (yr 1) | Recurring annual | Source quality |
|---|---|---|---|
| IL Articles of Organization | $150 | — | [S] |
| IL annual report | — | $75 | [S] |
| Registered agent (optional) | — | $0–150 | [S1] |
| Operating agreement | $0–800 | — | [A] |
| EIN, bank account | $0 | $0–180 (account fees) | [M/A] |
| Chicago business license (if required) | $250–1,000 per 2-year term | ≈$125–500/yr equivalent | [S1] — **verify with BACP** |
| Bookkeeping software | — | $0–480 | [A] |
| Terms/privacy/correction policy review | $500–1,500 | $0–500 updates | [A] |
| Trademark knockout + filing (optional yr 1) | $0–1,200 | — | [M/A] |
| Cyber + media/E&O insurance | — | $1,000–3,000 | [S/A] |
| CPA (Schedule C + IL return) | — | $300–1,000 | [A] |
| Domain, hosting, email (operating, not structural) | ~$20 | $100–600 | [A] |
| **Total (lean)** | **≈ $900** | **≈ $1,600** | |
| **Total (fully covered)** | **≈ $4,700** | **≈ $6,000** | |

**With a calling pilot:** add a TCPA counsel opinion (~$2,500–10,000 one-time [A]), a policy/script review, and TCPA-specific insurance if it is obtainable. These dwarf every structural cost above.

**Delaware alternative, for comparison:** add about $300 in DE tax, plus $150 for IL foreign admission instead of $150 domestic formation, plus a DE agent at $50–300 → **≈ $350–600/yr more** for no operational benefit.

## 10. Recommended formation sequence

1. **Now (this month):** name check → trademark knockout → file IL LLC → EIN → bank account → IP assignment → operating agreement → ask BACP about the Chicago license → bookkeeping.
2. **Before public launch:** terms/privacy/correction policies reviewed; cyber + media insurance bound.
3. **Before revenue:** affiliate and ad accounts opened under the LLC; CPA engaged for the first-year return; a sales-tax decision made on B2B product format (report vs. database access, because of Chicago's 15% lease tax).
4. **Before calling:** counsel opinion; written authorization; insurance check.
5. **Triggers to revisit:** net profit >$50–60k (S-corp); priced round or institutional angel (Delaware C-corp); cofounder (operating agreement with vesting); B2B sales >$100k or multi-state customers (sales-tax nexus review).

## 11. Questions for a lawyer or CPA

**Lawyer:** (1) Does an internet-only home business need a Chicago Home Occupation or Limited Business license, and at what 2026 fee? (2) Review the operating agreement and IP assignment. (3) Does the founder's personal participation in a future calling program create individual exposure that an LLC can't cover, and what governance helps? (4) Is a conversion to a Delaware C-corp straightforward later, and when would you recommend it? (5) Which contracts must be in the LLC's name before launch?

**CPA:** (1) Confirm no Illinois replacement tax applies to a disregarded single-member LLC. (2) At what profit level does an S-corp election make sense, given Illinois's 1.5% replacement tax and payroll costs? (3) Chicago PPLTT exposure if NicFinder sells database or dashboard access to Chicago-based customers. Does a PDF report or API feed change the answer? (4) The 1099 thresholds for 2026 under the 2025 tax law. (5) Estimated quarterly tax payments once revenue starts.

## Sources (accessed 2026-11-04)
- Illinois LLC formation $150 / annual report $75 (secondary, consistent): https://www.llcuniversity.com/illinois-llc/costs/ ; https://www.zenind.com/help/post/how-much-does-an-llc-cost-in-illinois-a-2026-guide-to-filing-fees-and-ongoing-costs ; https://www.statebusinesscompliance.com/blog/illinois-llc-taxes-fees-2026
- Illinois foreign LLC admission (Form LLC-45.5, $150): https://www.legalzoom.com/articles/how-to-register-a-foreign-llc-in-illinois ; https://www.statebusinesscompliance.com/blog/illinois-foreign-llc-registration ; statute 805 ILCS 180 / Article 45 (verify on ilsos.gov)
- Delaware LLC $300 annual tax: https://www.orrick.com/en/tech-studio/resources/faq/does-a-delaware-llc-pay-an-annual-franchise-tax ; https://www.zenind.com/help/post/do-delaware-llcs-pay-franchise-tax-a-complete-guide-to-the-300-annual-tax
- Illinois replacement tax 1.5% (IDOR): https://tax.illinois.gov/localgovernments/personal-property-replacement-tax.html ; Nolo overview: https://www.nolo.com/legal-encyclopedia/illinois-state-business-income-tax.html
- Chicago home-based business licensing: https://www.chicago.gov/city/en/sites/chicago-business-licensing/home/homebasedbusiness.html ; fee guide: https://chicago.gov/city/en/sites/chicago-business-licensing/home/business-licensing.html ; 2026 fee-hike report (secondary): https://beancount.io/blog/2026/07/29/chicago-business-license-fee-hikes-2026-guide ; Ordinance O2026-0026292: https://chicago.councilmatic.org/legislation/o2026-0026292/
- Chicago PPLTT 15% from Jan 1, 2026: https://www.salestaxinstitute.com/resources/chicago-personal-property-lease-transaction-tax-increase-2026 ; https://www.anrok.com/tax-news/chicago-cloud-tax-jumps-to-15-in-2026 ; https://taxnews.ey.com/news/2026-0384
- FinCEN BOI final rule exempting domestic companies (Aug 11, 2026): https://www.steptoe.com/en/news-publications/international-compliance-blog/fincen-issues-final-rule-eliminating-beneficial-ownership-reporting-for-us-companies-and-us-persons.html ; https://www.troutman.com/insights/relief-is-real-but-not-universal-fincen-permanently-ends-boi-reporting-for-us-companies/
- Cyber insurance premium benchmarks 2026 (secondary): https://www.quotesweep.com/blog/cyber-insurance-cost ; https://beancount.io/blog/2026/07/22/cyber-insurance-small-business-cost-breach-guide

**Not verified this session:** the official ilsos.gov fee schedule (all IL fees come from consistent secondary sources); the current Chicago license class and fee for internet-only home businesses; federal 2025-law changes to 1099 thresholds and QSBS (marked [M]).
