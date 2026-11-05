# 04 — ElevenLabs + Twilio: Call Quality, Workflow, and Cost per Accurate Price

**Prepared:** 2026-11-04 · **Phase 4 of 7** · **Research and economic design only.** No calling software was built or tested, no calls were placed, and no paid API was used. Any future test requires counsel clearance (Phase 1 Gate 2) **and** explicit founder authorization.
**Companion data:** `04_calling_unit_economics_model.csv` (every input and output, low/base/high).
**Builds on:** `docs/ELEVENLABS_CALLING_RESEARCH.md` (platform features verified 2026-11-04; not repeated here except where re-checked or corrected).
Labels: **[V]** official · **[S]** secondary · **[S1]** single secondary · **[VA]** vendor-advertised claim · **[A]** assumption · **[I]** inference.

---

## Bottom line

1. **Decisive KPI: cost per accurate, usable price.** In the model's base case it is **≈ $0.45 in variable cost**. The conservative-to-optimistic range is **$0.24–1.20**. Including fixed subscription floors and coverage failures, **100 distinct accurate prices cost ≈ $50–180; 1,000 cost ≈ $290–1,700 (base ≈ $620); 10,000 cost ≈ $2.8k–11k (base ≈ $4.8k)**. Keeping 1,000 known stores refreshed monthly costs ≈ $170–185/month, **but only ≈ 19–69% of those stores get an accurate refresh each month** (base 44%), because refusals and non-answers recur.
2. **The $0.90 vs $0.20 discrepancy is reconciled (register D1).** The $0.90 figure charged 3.5 minutes to *every* dial, including unanswered ones. The average billed agent time per attempt is closer to **0.4 minutes**. The $0.20 figure is a reasonable *cost per model-generated price*. **Neither counted accuracy, QA, line-type scrubbing, or fixed floors.** On one consistent set of assumptions, both methods land at **≈ $0.10–0.21 per *generated* price** and **≈ $0.45 per *accurate* price** (§7).
3. **The biggest unknown is not cost but validity.** A 2009 *Public Health Reports* study piloted telephone collection of cigarette prices against in-store observation and **concluded the telephone method did not provide valid price data**, so the authors used in-store observation only [V: PMC2693167]. That is the single most relevant published benchmark. It argues for an **audit-based acceptance policy**, and it means the "accurate in audit" rate (assumed 80–95%) is the assumption most likely to break the model.
4. **No published "AI success rate" exists for this call type.** Every funnel rate here is an editable assumption, anchored where possible. The only published anchor on human answer rates is a small-business study: ≈38% of calls answered by a person, ≈38% to voicemail, ≈24% no response [S: 411 Locals study, 85 businesses, cited by multiple secondary sources].
5. **Calling cost is cheap relative to everything else.** At the base case, AI calling is roughly **3× cheaper per accurate price than paid human calling** (≈$1.50) and far cheaper than in-person checks (≈$3–5). But Phase 1 legal risk and Phase 3 revenue limits, not per-call cost, decide whether it is worth doing.
6. **A simpler IVR-style pipeline is cheaper but probably worse.** It handles clarification ("regular or Ultra? 15 or 20 count?") poorly, which is where accuracy is lost. **Recommendation:** if calling is ever authorized, test the full conversational agent against human calls first. Treat IVR as a fallback only if the agent's cooperation rate is not better.

---

## 1. Platform facts re-checked (2026-11-04)

| Item | Finding | Label |
|---|---|---|
| ElevenLabs Agents per-minute price | **$0.08/min** flat across self-serve plans; burst over-concurrency billed at **$0.16/min**; LLM and telephony billed separately | [V repo doc same day; S multiple 2026 sources] |
| ElevenLabs LLM cost | A single source reads the pricing calculator at ≈ $0.0005/min (GPT-5 Nano) and $0.0012/min (Gemini 2.5 Flash). Larger models cost more. | [S1] — model uses $0.002–0.02/min |
| ElevenLabs plans and concurrency | Creator $22 (275 min, 10 concurrent) … Business $990 (12,375 min, 40 concurrent). Batch calls use min(50% of workspace, 70% of agent concurrency). | [V via repo doc] (Phase 5 uses these) |
| ElevenLabs billing granularity | **Not stated.** The founder's April 2026 test calls imply finer than whole-minute billing. | [?] — model assumes per-second |
| Twilio US outbound | **$0.014/min** | [V: Twilio pricing page] |
| Twilio billing increment | **Whole minutes, rounded up** (a 69 s call billed as 2 min in a third-party test). Twilio's own docs were not found stating it. | [S1] |
| Twilio unanswered calls | Not billed | [S1: classmethod usage-records test] |
| Twilio AMD | **$0.0075 per call where enabled and answered**; busy/failed not charged | [V: Twilio AMD announcement] |
| Twilio Lookup line type | **$0.008 per request**; basic formatting free | [V: Twilio Lookup pricing page] |
| Twilio Media Streams | $0.0044/min (repo doc). Whether the ElevenLabs native integration incurs it is unverified. The model includes it (conservative). | [?] |

**Vendor-advertised capabilities not independently measured [VA]:** ElevenLabs advertises low-latency "Flash" TTS models, interruption handling and turn-taking, a voicemail-detection system tool, and structured data collection. **No independent benchmark** for interactive voice-agent accuracy on *short retail price questions over 8 kHz phone audio* was found. Public ASR leaderboards use clean 16 kHz speech (top entries ≈5% WER [S: Open ASR Leaderboard]). An older real-call study measured **16.5–19.2% WER** for commercial recognizers on customer-service calls [S: 2020 Avaya/university study via Cekura]. Vendors repeatedly warn that numbers and digits are a weak spot on telephony audio [S]. **Implication [I]:** a spoken price like "eight forty-nine" is short but high-stakes. The read-back confirmation step in the existing script is the main accuracy control.

## 2. Pipeline variants compared

Estimates are [A/I] unless labeled.

| Variant | How it works | Accuracy | Naturalness | Latency | Avg duration | Cost per accurate price (est.) | Complexity |
|---|---|---|---|---|---|---|---|
| **A. Full ElevenLabs agent** (LLM + TTS + ASR, native Twilio) | Conversational. Handles "which one?", "hold on", read-back. | Highest among automated options. Can clarify Ultra vs. regular and 15 vs. 20 count. | High [VA] | Sub-second turns [VA] | 45–90 s success; 15–25 s refusal | **$0.24–1.20 (base $0.45)** | Medium |
| **B. Scripted IVR** (Twilio TTS prompts + speech/DTMF gather + LLM parse of the utterance) | Fixed prompts: "Please say the price of a single can of ZYN…" | Lower. Can't resolve ambiguity, and clerks talk over prompts. | Low ("robocall" feel → more hang-ups) | n/a | 30–60 s | Cheaper per attempt (no $0.08/min agent), **but lower cooperation and capture could make it more expensive per accurate price**. Twilio speech-recognition pricing was not verified this session. | Low-Medium |
| **C. AI dial + human review of every transcript** | A as dialer; human confirms each extracted price from the transcript | Higher accepted-accuracy (catches extraction errors, not clerk errors) | High | — | + ~1 min of human time per cooperative call | ≈ base + $0.30–0.40 | Medium |
| **D. Human caller** | Person dials and types the price into a form, no recording | Good capture; same clerk-error problem (PHR 2009) | Highest | — | ~1.2 min per dial incl. no-answers → ~45 dials/hr | **≈ $1.00–2.50** (≈$21.60/hr loaded ÷ ~9–22 accurate/hr) | Low |
| **E. In-person field check** | Walk in, ask or see the price, optional receipt | **Ground truth** (best validity) | — | — | 6–10 stores/hr in dense areas | **≈ $2–5** | Low |
| **F. Community confirmations** | Users confirm or dispute | Varies; needs corroboration | — | — | — | ≈ $0 marginal | Exists in the app |

**Recommendation [I]:** *E* as the audit standard; *D* as the comparison arm; *A* as the candidate scaling method; *F* as the cheap freshness layer. Variant *B* is not worth testing unless *A*'s cooperation proves no better than a robocall's.

## 3. Disclosure, consent, and call etiquette

Policy from Phase 1 (§1.4, §1.5): identify NicFinder and the automated nature **at the start**; ask permission; say "may be transcribed"; no promotion; give a callback number; honor opt-outs immediately; call 10:00–17:00 local time, business days; never pose as a human.

**Does disclosure length matter economically? Yes, mainly through Twilio's whole-minute rounding [model].**
- Agent time itself is cheap: about $0.0013 per second per human-answered call ($0.08 ÷ 60).
- **The cliff is at 60 seconds.** In the model, adding 10 s to every human-answered call (successful calls 60 s → 70 s) raises the base cost per accurate price from **$0.446 to $0.508 (+14%)**. Almost all of that increase comes from successful calls crossing into a second billed Twilio minute.
- For comparison, a **5-point drop in cooperation** (60% → 55%) raises the cost from $0.446 to $0.462 (+3.6%).
- **So:** design the whole successful call (disclosure, question, read-back, close) to finish in **under 60 seconds**. Get there by trimming filler, not by dropping the disclosure. Keep the opening short and plain, not hidden. A compliant opening of about 8–10 seconds:

> "Hi, this is an automated assistant calling for NicFinder, a price-comparison website. Could I ask one quick question about a shelf price? This call may be transcribed."

  …then the question, a read-back, and a close with the callback number and "if you'd like us not to call again, just say so." **Counsel must approve the wording** (Phase 1 A6).
- **Do not** shorten by dropping the AI or company identification. That trades a small cooperation gain for the program's largest legal and reputational risk.

**Business hours:** use store-listed hours when known. Avoid 7–9 a.m. and 4–7 p.m. shift-change and commuter rushes at c-stores [A]. Retry no-answers at a different time on a different day.

**Refusals and opt-outs:** "no," "not interested," and "who is this?" followed by a hang-up count as refusals. One retry at least a week later is allowed under the plan (§6), unless the store said "don't call," which means permanent suppression.

**No-retention option:** ElevenLabs' Zero Retention Mode is **incompatible with batch calling** [V: ElevenLabs batch-call docs via repo doc]. So for a no-retention design, either place calls one at a time through the API or accept short-term transcript retention (≤30–90 days, deleted after QA). That is a **design trade-off counsel should weigh** (Phase 1 §1.5): no retention reduces breach and BIPA exposure but removes the ability to audit disputed prices.

## 4. Operational success funnel and acceptance policy

| Stage | Definition | Base rate | Basis |
|---|---|---|---|
| S0 Dial initiated | Number passed line-type scrub (business landline / fixed VoIP, not suppressed) | 85% of listed stores eligible | [A] (wireless/unknown/residential excluded) |
| S1 Connected | Not busy, failed, or disconnected | 95% of attempts | [A] |
| S2 Human reached | vs. voicemail/IVR (50% of non-human connects) or ring-out | 55% of connected | [A], anchored on 38% human-answered for small businesses [S], adjusted up for staffed stores |
| S3 Willing and able to quote | Clerk gives a price (not "manager only," "can't give prices," hang-up) | 60% of human | [A] |
| S4 Correct product and price captured | Regular ZYN single can (not Ultra, not 5-pack), count (15 vs 20) known, tax status known or flagged | 85% of cooperative | [A] |
| S5 Extraction accepted | Data-collection fields complete, read-back confirmed, price in plausible band, ASR/LLM agree | 92% of captured | [A] |
| S6 Accurate in audit | Matches an independent check (in-person or receipt) within $0.10, same SKU, within 7 days | 90% of accepted | [A]; **PHR 2009 is a warning that this could be much lower** |

**Base yield:** 0.95 × 0.55 × 0.60 × 0.85 × 0.92 × 0.90 ≈ **0.22 accurate prices per dial attempt** (about 4.5 dials per accurate price).

**Acceptance policy (what counts in the denominator):**
- **Count only:** a single-can shelf price for a named product line, with pack count known (15 or 20), tax status known or explicitly "pre-tax by default per store's answer," a read-back confirmed by the respondent, extraction confidence ≥ 0.7 (repo §5.3 scoring), and an observation date.
- **Exclude:** ambiguous answers ("like eight-something"), wrong product (Ultra quoted as regular), "it depends on flavor" with no single value, values outside $3.50–$14.00 without a second confirmation, prices for stores whose identity is uncertain (shared phone lines), anything the model inferred but the respondent didn't say (**hallucination check: the price string must appear in the transcript**), and anything older than the freshness window.
- **Audit:** a rolling random 10% of accepted prices verified in person or by human callback within 7 days. Publish the measured error rate. If audit accuracy is <90% for a month, suspend publishing automated prices until the cause is fixed.

## 5. Cost equations

All costs in USD. "Attempt" means one dial.

**Per-attempt variable cost**
```
C_attempt = P_vm  × [ (ceil(t_vm/60)  × (TW + MS) + AMD) × 1.10 + (t_vm/60)  × (EL + LLM) ]
          + P_ref × [ (ceil(t_ref/60) × (TW + MS) + AMD) × 1.10 + (t_ref/60) × (EL + LLM) ]
          + P_ok  × [ (ceil(t_ok/60)  × (TW + MS) + AMD) × 1.10 + (t_ok/60)  × (EL + LLM) + 0.001 ]
          (ring-outs and failed connects ≈ $0)
C_allin   = C_attempt + QA_rate × Y_accept × QA_cost + 0.15 × P_ok × $0.33 (transcript review) + LOOKUP/3
Y_acc     = S1 × S2 × S3 × S4 × S5 × S6
Cost per accurate price (variable) = C_allin / Y_acc
```
where TW = $0.014, MS = $0.0044, AMD = $0.0075, EL = $0.08, LOOKUP = $0.008, and 1.10 is an assumed regulatory/tax uplift on Twilio charges.

**Fixed monthly floors (kept separate):** ElevenLabs plan ($22 Creator → $990 Business; only the *unused* included minutes are a true floor, because used minutes are already in the variable cost), phone number $1.15, Trust Hub/CNAM/misc ≈ $10 [A]. **Excluded and listed separately:** counsel (Phase 1), build and maintenance engineering, the founder's time.

**Results:**

| | Conservative | **Base** | Optimistic |
|---|---|---|---|
| Accurate prices per dial | 0.078 | **0.221** | 0.436 |
| Variable cost per dial (calls only) | $0.061 | **$0.056** | $0.059 |
| All-in variable per dial (incl. QA, review, lookup share) | $0.093 | **$0.098** | $0.104 |
| **Cost per model-generated price** (calls only, S4 stage) | $0.53 | **$0.21** | $0.12 |
| **Cost per ACCURATE usable price** | **$1.20** | **$0.45** | **$0.24** |
| Dials per accurate price | 12.9 | **4.5** | 2.3 |

Per-dial cost is nearly flat across scenarios. **The yield drives everything**: going from the conservative to the optimistic yield changes the cost per accurate price 5×. The yield is the product of six stages, so several modest misses compound.

### 5.1 Worked example (the brief's illustration)
10 stores dialed (one attempt each). Suppose 6 humans answer, 5 cooperate, 4 give a correct, accepted, audit-verified price. Costs: 4 successful calls × $0.115 + 1 refusal × $0.057 + 3 voicemails × $0.037 + 2 ring-outs × $0 ≈ $0.63 in calls. Add QA (10% × 4 × $1.00 = $0.40), transcript review (≈$0.25), and lookups (10 × $0.008 = $0.08) ≈ **$1.36 total → $0.34 per accurate price.** If you instead assume the brief's round "$2 total," that is **$0.50 per accurate price**, the same order of magnitude. Note that at this scale the **fixed floor dominates**: one month of the Creator plan, number, and Trust Hub (≈$33) spread over 4 prices is $8 per price. **Small tests always look expensive per price, so judge them on rates, not dollars.**

### 5.2 Sensitivity (base case, one variable at a time → cost per accurate price)

| Variable | Low | Base | High | Cost/accurate at low → high |
|---|---|---|---|---|
| Human answer rate (S2) | 40% | 55% | 70% | $0.48 → $0.43 |
| Cooperation (S3) | 40% | 60% | 75% | $0.54 → $0.41 |
| Audit accuracy (S6) | 70% | 90% | 95% | $0.57 → $0.42 |
| Successful call duration | 90 s | 60 s | 45 s | $0.54 → $0.42 |
| ElevenLabs billing per *whole* minute instead of per second | — | per-second | whole-minute | $0.45 → $0.57 |
| LLM cost | $0.02/min | $0.005/min | $0.002/min | $0.47 → $0.44 |

(Each row recomputed from the model with all other inputs at base.)

**Audit accuracy, cooperation, and keeping successful calls under 60 s matter most. The human answer rate matters less than intuition suggests,** because non-answered dials are nearly free: ring-outs cost nothing and voicemails cost about $0.04. Billing granularity (whether ElevenLabs bills per second or per minute) is a material unknown worth about $0.12 per price. LLM choice barely matters. The human-behavior rates and the data-validity rate **can only be learned from a pilot**.

**Confidence:** I'd put roughly 60% probability on the true base-case cost per accurate price falling within $0.30–0.80, *if* audit accuracy is ≥85%. If phone-quoted prices prove systematically unreliable (as in PHR 2009), cost per *accurate* price could exceed $1.50, or calling becomes unusable as a primary source regardless of cost.

## 6. Building a dataset: 100 / 1,000 / 10,000 distinct accurate store prices

**Store-level process (base):** up to 6 attempts over 2 weeks for non-answers, at varied times; refusers retried once after a week (assume 25% convert) [A]. Result: ≈2.3 dials per store and **≈49% of eligible stores yield an accurate price** (conservative 27%, optimistic 70%). Coverage failures: about 15% of listed stores are ineligible after the scrub, plus non-answers, refusals, and inaccurate captures.

| Scenario | Target accurate prices | Stores listed (pre-scrub) | Stores dialed | Dials | Agent minutes | **Total cost** | **$/accurate** |
|---|---|---|---|---|---|---|---|
| Conservative | 100 | 540 | 378 | 1,152 | 518 | $180 | $1.80 |
| Conservative | 1,000 | 5,400 | 3,780 | 11,521 | 5,184 | $1,697 | $1.70 |
| Conservative | 10,000 | 54,000 | 37,798 | 115,208 | 51,844 | $11,140 | $1.11 |
| **Base** | **100** | **242** | **205** | **470** | **211** | **$64** | **$0.64** |
| **Base** | **1,000** | **2,417** | **2,054** | **4,697** | **2,114** | **$622** | **$0.62** |
| **Base** | **10,000** | **24,166** | **20,541** | **46,967** | **21,135** | **$4,847** | **$0.48** |
| Optimistic | 100 | 156 | 144 | 247 | 111 | $51 | $0.51 |
| Optimistic | 1,000 | 1,563 | 1,438 | 2,474 | 1,113 | $291 | $0.29 |
| Optimistic | 10,000 | 15,627 | 14,377 | 24,741 | 11,134 | $2,828 | $0.28 |

**The binding constraint is the store universe, not money.** In the base case, 1,000 accurate prices requires dialing about **2,050 stores**, which is roughly the whole licensed tobacco-retail universe of Chicago (Phase 5 estimates it). **10,000 accurate prices is a multi-metro project** (about 24,000 listed stores ≈ 15–20 metros). Cost per price falls slightly at scale as fixed floors amortize.

**Maintaining freshness (refresh of 1,000 stores with a known price, 2 attempts/month, previously cooperative stores cooperate at 60/80/90%):**

| Scenario | Monthly cost | Share of stores accurately refreshed each month | Cost per accurate refresh |
|---|---|---|---|
| Conservative | $183 | 19% | $0.97 |
| **Base** | **$179** | **44%** | **$0.41** |
| Optimistic | $170 | 69% | $0.25 |

**Implications:**
- **Monthly calling alone cannot keep most prices ≤30 days old.** In the base case, less than half refresh each month. To reach 80% freshness, combine calls with community confirmations, retailer self-reporting, and longer freshness windows. Prices are sticky (tax events and promotions are the big movers), so a 45–60 day window with "last confirmed" dates is honest and probably adequate (Phase 7 examines price change frequency).
- **Refresh cadence economics:** weekly refresh quadruples cost for limited benefit if prices rarely change. Trigger-based refresh (user dispute, known tax change, chain promotion) is the efficient pattern [I].
- **Reattempts:** each additional attempt round mostly recovers *non-answers*. Retries do little for refusals. Beyond ~6 attempts, the marginal cost per new accurate price exceeds $1 [I].

## 7. Reconciling the repository's $0.90 vs $0.20

| Step | BUSINESS_RESEARCH (A1–A5) | ELEVENLABS_CALLING_RESEARCH §6.2 | This model (base) |
|---|---|---|---|
| Cost per dial | **$0.35** = 3.5 min × $0.10/min, applied to **every** dial | $0.118 (bills every failed attempt as answered, 25 s; success 75 s; per-minute Twilio + Media Streams; LLM $0.01) | **$0.056** calls only; $0.098 all-in |
| Success definition | "price obtained" = answer 65% × price 60% = **39%** | "success" = **60%** | Generated price 26.7%; **accurate 22.1%** |
| Result | **$0.90** per obtained price | **$0.20** per success | **$0.21** per generated price; **$0.45** per accurate price |

**Where each went wrong or omitted something:**
1. **$0.90 overstated cost per dial about 8×.** Average billed agent time per dial is ≈0.41 minutes (most dials are ring-outs, voicemails, or short refusals), not 3.5. With the corrected duration and its own 39% success rate: 0.41 min × $0.10 ÷ 0.39 ≈ **$0.105 per obtained price**. That nearly matches the founder's **April 2026 measured ≈ $0.108 per observation** (HISTORICAL; ~29 test calls), which is reassuring.
2. **$0.20 assumed 60% success per dial.** That is plausible for "price obtained per *answered human*", but optimistic per *dial*, since it folds no-answers into a cheap failure bucket while treating success as 60% of dials. With our funnel, success per dial to a captured price is ≈27%. Its cost per dial ($0.118) was conservative (every failure billed as answered), which partly offset the optimistic success rate. That is why it landed close to our $0.21.
3. **Both omitted:** audit-based accuracy (S5–S6), QA labor, transcript review, line-type lookups, and the fixed monthly floors, which dominate in small pilots.

**Reconciled statement:** at verified November 2026 prices, a model-*generated* price costs about **$0.10–0.21**, and an audit-*accurate*, usable price about **$0.45 (range $0.24–1.20)**. Plan with **$0.50–0.75 per accurate price** until a pilot measures the real rates.

## 8. Proposed future experiment (proposal only — do not execute)

**Preconditions:** a written counsel opinion (Phase 1 A1–A10); founder authorization in writing; Trust Hub/SHAKEN registration with A-level attestation; an approved script; line-type scrub; no audio retention; a suppression list; a staffed or voicemail callback number.

**Design: a three-arm comparison on randomly assigned, scrub-eligible Chicago stores in a dense area (Lincoln Park / Lakeview / Wicker Park)**
- **Arm A — AI agent** (variant A): 120 stores.
- **Arm D — human caller** (same script content, live person, no recording): 60 stores.
- **Arm E — in-person ground truth:** every store in Arms A and D that yields a price is visited within 48 hours by a field checker (ask the clerk and observe; buy one can if needed, with a receipt). Also visit a random 20 stores where calls failed, to measure whether failures are related to price (e.g., expensive stores refusing more often).
- **Why these sizes:** to estimate a ~90% audit-accuracy rate within ±6 percentage points (95% CI) needs ≈100 accepted prices. Arm A at the base yield (49% per store) gives ≈60 accepted prices from 120 stores, so this estimates accuracy within about ±8 points. That is enough for a go/no-go decision, not for precision. If budget allows, expand Arm A to 200 stores. The human arm is a comparator, so ±10 points is acceptable.
- **Error taxonomy (code every miss):** wrong SKU (Ultra vs. regular; 15 vs. 20 count); quantity (single vs. 5-pack); tax confusion (pre- vs. post-tax); ASR mishear (digits); LLM extraction error (number not in transcript = hallucination); clerk error or guess; price changed between call and visit; store identity error (shared phone line); IVR/voicemail misclassified as human.
- **QA:** two independent coders for 20% of transcripts (inter-rater agreement); all prices checked against the field visit; daily review of opt-outs and complaints.
- **Measured outputs:** S1–S6 rates per arm; durations; actual billing granularity (ElevenLabs and Twilio invoices); Media Streams charges; AMD accuracy; opt-out rate; complaint count; spam-label check on the calling number (third-party reputation lookup); cost per accurate price per arm.
- **Budget estimate [A]:** AI calls ≈ $40; human caller ≈ 6 hours ≈ $150; field checks ≈ 120 visits × ~$4 ≈ $500 plus cans purchased (~$500 if buying, $0 if asking only); plans and fees ≈ $40. **Total ≈ $700–1,300, excluding counsel.**
- **Go criteria (all must hold):**
  1. Arm A audit accuracy ≥ 92% of accepted prices, and **not worse than Arm D by more than 3 points**.
  2. Arm A cost per accurate price ≤ $0.75, and ≤ 50% of Arm D's.
  3. Opt-out or complaint rate ≤ 2% of human-answered calls; zero contact with excluded line types; no spam labeling of the number.
  4. Hallucinated prices (value absent from transcript) = 0 after the guardrail.
- **No-go triggers:** accuracy < 85% in either phone arm (the PHR 2009 result replicates), meaning phone collection is unsuitable as a published source and should be demoted to "lead generation for verification"; any complaint involving a wireless number; cooperation in Arm A below 60% of Arm D's (AI disclosure is killing cooperation).

## 9. What would change this analysis
- **Ground-truth accuracy far below 90%** → calling becomes a lead generator, not a data source. Shift to in-person sampling plus community data.
- **Measured cooperation ≥ 75%** → base cost per accurate price falls toward $0.30, and a Chicago-wide dataset costs under $500.
- **ElevenLabs or Twilio price changes:** each ±$0.02/min on agent pricing moves the cost per accurate price by only a few cents. Low sensitivity. **Billing granularity** (per-second vs. whole-minute) matters more, at about $0.12 per price.
- **Counsel restricts calling to stores that opt in first** → cost per accurate price is irrelevant; the funnel becomes a retailer-recruitment problem (Phase 5 alternatives).

## Sources (accessed 2026-11-04)
- ElevenLabs Agents pricing (official page via repo doc): https://elevenlabs.io/pricing/agents ; 2026 secondary confirmations: https://www.getmacha.com/blog/elevenlabs-agents-pricing-explained ; https://www.happyrobot.ai/hub/elevenlabs-pricing ; https://www.cloudzero.com/blog/elevenlabs-pricing/
- ElevenLabs batch calling (Zero Retention incompatibility) and platform docs: see `docs/ELEVENLABS_CALLING_RESEARCH.md` §1 sources
- Twilio US voice pricing: https://www.twilio.com/en-us/voice/pricing/us ; AMD pricing: https://www.twilio.com/en-us/blog/answering-machine-detection-generally-available ; unanswered-call billing test: https://dev.classmethod.jp/en/articles/twilio-call-api-unanswered-ringing-billing-verification/ ; whole-minute billing (third party): https://quiq.com/blog/twilio-voice-pricing/
- Twilio Lookup pricing ($0.008 line type): https://www.twilio.com/en-us/user-authentication-identity/pricing/lookup
- Small-business call answering (411 Locals study, secondary citations): https://www.usecarly.com/blog/missed-call-statistics/ ; https://schedulingkit.com/statistics/missed-call-statistics
- Telephony ASR accuracy context: https://www.cekura.ai/blogs/word-error-rate ; https://www.parloa.com/knowledge-hub/word-error-rate/ ; Open ASR Leaderboard: https://benchmarklist.com/benchmarks/open_asr_leaderboard/
- **Phone vs in-store cigarette price validity (Public Health Reports, 2009, vol. 124):** https://pmc.ncbi.nlm.nih.gov/articles/PMC2693167/
- Massachusetts retailer price survey participation (>70% annually): https://www.mass.gov/info-details/an-act-modernizing-tobacco-control-evaluation-data-overview
