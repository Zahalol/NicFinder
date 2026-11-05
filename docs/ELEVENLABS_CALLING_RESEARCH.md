# NicFinder — ElevenLabs Agents Outbound Calling: Research & Design Document

> **Read with [`research/`](../research/RESEARCH_INDEX.md) — its later findings win where they differ.**
> The 2026-11-05 due diligence re-checked this doc
> ([`research/00_SOURCE_AND_CONTRADICTION_REGISTER.md`](../research/00_SOURCE_AND_CONTRADICTION_REGISTER.md)):
> - **Recommendation:** [`research/99`](../research/99_FOUNDER_DECISION_BRIEF.md) is **NO-GO on automated calling for now**. Validate price spread and B2B demand with manual collection first.
> - **Unit economics:** ≈$0.21 per generated price but ≈$0.45 per *accurate* price once failed and wrong answers are counted (research/04, with model CSV).
> - **Illinois eavesdropping:** the "$10,000 per violation" figure below is not in 720 ILCS 5/14-6; the civil remedy is actual plus punitive damages (research/01, register L7).
> - **Business-landline TCPA:** treat "no consent needed" as an open question for counsel, not settled (register L4).
> - **Refresh cadence:** this doc's monthly baseline and BUSINESS_RESEARCH's 3-week cadence disagree; research/09 has the freshness analysis.

**Status:** Research only. No system has been built. No calls have been placed. No API has been tested.
**Scope:** Future outbound-calling system (ElevenLabs Agents + Twilio) to ask Chicago-area gas stations and convenience stores the shelf price of ZYN nicotine pouches.
**Research date:** 2026-11-04 (all "accessed" dates below are 2026-11-04 unless noted).
**Author:** Automated research analyst (Claude). This document is not legal advice.

---

## TL;DR

- **Platform is technically ready.** ElevenLabs Agents has a native Twilio integration, a one-call outbound API (`POST /v1/convai/twilio/outbound-call`) with built-in Twilio answering-machine detection and hang-up-on-voicemail rules, LLM-powered structured **data collection** (exactly what we need: extract `price_usd`, `availability`, etc. from each call), **post-call webhooks** with HMAC signing, and **batch calling** from a CSV of phone numbers with per-row dynamic variables. All four key doc pages verified live on 2026-11-04.
- **Current verified pricing (Nov 2026):** ElevenLabs Agents = **$0.08/min** flat on every self-serve plan (Creator $22/mo includes 275 min; Pro $99/1,238 min; Scale $299/3,738 min; Business $990/12,375 min; burst concurrency billed at $0.16/min). LLM usage billed separately. Twilio = **$0.014/min** US outbound, **$1.15/mo** per local number, **$0.0075/answered call** for AMD, $0.0025/min recording, $0.0044/min Media Streams.
- **Estimated cost per successful price observation: roughly $0.15–$0.30, base case ≈ $0.19** (at 60% success, ~75 s successful call, ~25 s failed attempt). That is in the same ballpark as the HISTORICAL April 2026 workbook figure (~$0.108/observation), which used shorter calls (37 s) and no disclosure preamble.
- **The single biggest legal risk:** the FCC's **Feb 8, 2024 Declaratory Ruling** (CG Docket 23-362) holds that AI-generated voices are "artificial" under the TCPA. Artificial-voice calls to **wireless numbers require prior express consent — even purely informational, non-marketing calls**. Many small-store "business" numbers published online are actually cell phones or wireless-backed VoIP. Statutory damages are $500–$1,500 **per call**. A wireless-line scrub and a conservative number-vetting pipeline are mandatory, and **qualified TCPA counsel must review the program before any call is placed**.
- **Second-biggest risk (Chicago-specific):** Illinois is an all-party-consent state (720 ILCS 5/14). Recording or transcribing calls without disclosure/consent risks felony liability and a private right of action. Illinois also has its own Automatic Telephone Dialers Act (815 ILCS 305). Mitigation: up-front recording disclosure in the agent's first message, or no audio retention — **requires legal counsel** either way.
- **Identity:** The historical prompt ("a normal 25-year-old guy") is rejected. The agent must truthfully identify itself as an automated/AI assistant calling on behalf of a named price-comparison service, with a callback number. A transparent disclosure script is drafted in §4.
- **Recommendation:** Do not build the dialer first. Sequence = legal review → tiny consenting-number pilot → partnership/crowdsourcing comparison (§7) → scale only if counsel clears it and unit economics beat alternatives.

---

## 1. ElevenLabs Agents platform (verified 2026-11-04)

ElevenLabs' conversational-agent product is currently branded "ElevenLabs Agents" / "ElevenAgents"; docs live under `elevenlabs.io/docs/eleven-agents/...`. All four URLs from the project brief resolve as of 2026-11-04 (no redirects observed). Note: some docs pages intermittently return HTTP 403 to automated fetchers; all content below was verified from successful fetches.

### 1.1 Native Twilio integration

Source: https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/native-integration (accessed 2026-11-04)

- Two number types: **purchased Twilio numbers** (inbound + outbound) and **verified caller IDs** (outbound only, cannot receive calls or be assigned an agent).
- Import flow: ElevenAgents dashboard → Phone Numbers tab → enter label, phone number, Twilio Account SID and auth token. Docs recommend a **limited-permission Twilio API key** rather than account-wide credentials.
- ElevenLabs auto-configures the Twilio number's settings and detects inbound/outbound capability.
- Outbound test calls can be launched from the dashboard; the **agent speaks first**, so the first message must be configured (this is where our disclosure script in §4 goes).
- All calls appear in the Calls History dashboard.

### 1.2 Outbound-call API

Source: https://elevenlabs.io/docs/eleven-agents/api-reference/integrations/twilio/outbound-call (accessed 2026-11-04)

- `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call` (regional hosts available: US, EU, India, Singapore).
- Required body: `agent_id`, `agent_phone_number_id`, `to_number`.
- Optional: `conversation_initiation_client_data` with `dynamic_variables` (per-call store name, etc.), `conversation_config_override` (first message, prompt, voice, max duration, language), `user_id`, `source_info`, and workflow/procedure start points.
- `telephony_call_config`:
  - `ringing_timeout_secs` (default 60) — we should lower this (e.g., 25–30 s) for no-answer economy.
  - `twilio_call_recording_enabled` (default **false**) — leave false pending Illinois legal review (§3.4).
  - `twilio_machine_detection` — **native AMD** with a mode and rules that **hang up on specified verdicts** (e.g., machine detected). This is the mechanism for "hang up on voicemail" without burning agent minutes.
- Response: `success`, `message`, optional `conversation_id` and `callSid` (join key between ElevenLabs and Twilio records — store both).

### 1.3 Data collection (structured post-call extraction)

Source: https://elevenlabs.io/docs/eleven-agents/customization/agent-analysis/data-collection (accessed 2026-11-04)

- Configured in the agent's **Analysis tab → Data collection**; LLM-powered extraction from the transcript after each call.
- Each item: unique **name**, **data type** (`string`, `boolean`, `integer`, `number`), and a **description** that is passed to the extraction LLM (should state expected format, how to handle missing info, and valid/invalid examples).
- Limits: **25 items per agent** on self-serve plans (50 on Trial/Enterprise) — ample for our schema (§5.4).
- Missing/ambiguous values come back null/empty — our importer must treat null as `unknown`, never as $0.
- Results appear in conversation history **and in post-call webhooks**.

Draft data-collection fields (maps to CSV in §5.4): `zyn_price_usd` (number), `zyn_ultra_price_usd` (number), `zyn_carried` (boolean), `zyn_ultra_carried` (boolean), `tax_included` (string: "true"/"false"/"unknown"), `deal_exists` (boolean), `deal_min_qty` (integer), `deal_price_per_can_usd` (number), `deal_total_usd` (number), `deal_conditions` (string), `answered_by` (string: human/ivr/voicemail/unknown), `respondent_confident` (boolean: did the respondent confirm the price when read back), `refused` (boolean), `notes` (string).

### 1.4 Post-call webhooks

Source: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks (accessed 2026-11-04)

- Event types:
  - `post_call_transcription` — full transcript, `analysis` (incl. data-collection results, `transcript_summary`, `call_successful`), `metadata` (timing, **cost**), and the `conversation_initiation_client_data` we sent (so our `external_store_id` dynamic variable round-trips — this is our provenance join).
  - `post_call_audio` — base64 MP3 of the full call (do **not** enable pending Illinois recording review, §3.4).
  - `call_initiation_failure` — `busy` / `no-answer` / `unknown` (voicemail pickups do *not* fire this event; they complete as short conversations).
- Security: HMAC via `ElevenLabs-Signature` header (SDK `constructEvent`/`construct_event` validates signature + timestamp); optional static-egress-IP allowlist; optional write-only custom headers.
- Delivery: endpoint must return HTTP 200; retries configurable; webhook **auto-disabled after ≥10 consecutive failures** (monitor this); dedupe by `conversation_id`.
- Enabled workspace-wide or overridden per agent.

### 1.5 Batch calling

Source: https://elevenlabs.io/docs/eleven-agents/phone-numbers/batch-calls (accessed 2026-11-04)

- Create via dashboard or API ("Create batch call" / "List batch calls" endpoints) with an agent, an imported phone number, and a recipient file.
- Recipient list: **CSV or XLS** upload; `phone_number` column mandatory; special override columns `language`, `first_message`, `system_prompt`, `voice_id`; **every other column becomes a per-call dynamic variable** (e.g., `store_name`, `external_store_id`).
- Scheduling: immediate or a chosen date/time/timezone; single-recipient test mode.
- Concurrency: batches use **min(50% of workspace concurrency, 70% of agent concurrency)**.
- Zero Retention Mode is incompatible with batch calls.
- The docs page itself warns that outbound campaigns must comply with **TCPA and state laws**.

### 1.6 Pricing, plans, concurrency (verified)

Source: https://elevenlabs.io/pricing/agents (accessed 2026-11-04)

| Plan | $/mo | Included call minutes | Overage | Concurrent calls |
|---|---|---|---|---|
| Free | $0 | 15 | $0.08/min | 4 |
| Starter | $6 | 75 | $0.08/min | 6 |
| Creator | $22 | 275 | $0.08/min | 10 |
| Pro | $99 | 1,238 | $0.08/min | 20 |
| Scale | $299 | 3,738 | $0.08/min | 30 |
| Business | $990 | 12,375 | $0.08/min | 40 |
| Enterprise | custom | custom | custom | "elevated" |

- Flat **$0.08/min** across all self-serve tiers (the HISTORICAL $0.09–0.12/min from April 2026 is no longer what the pricing page shows).
- **Burst pricing:** optional; up to 3× the concurrency limit, with over-limit calls billed at **$0.16/min**.
- **LLM cost billed separately** (varies by model; third-party trackers cite ~$0.0005–$0.045/min depending on model — treat as unverified; measure in pilot). The pricing page is internally inconsistent on whether LLM fees are "billed separately" vs "deducted from credits" — verify on first invoice.
- **ElevenLabs charges no telephony fee** when you bring your own Twilio/SIP — Twilio bills separately.
- ASSUMPTION (unverified): per-second vs per-minute proration of agent minutes is not stated on the pricing page; the historical observed costs (~37 s calls ≈ $0.07) imply finer-than-whole-minute billing. Verify in pilot.

### 1.7 Export methods

- **Push:** post-call webhooks (§1.4) — primary path; near-real-time; includes data-collection results.
- **Pull:** `GET /v1/convai/conversations` (verified 2026-11-04: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/list) — cursor-paginated (page_size ≤ 100), filterable by agent, time range, duration, call success, **data-collection filters**, dynamic variables, termination reason; can include `data_collection_results` per record. A per-conversation detail endpoint with full transcript exists in the same API family (verify exact path during build).
- **Dashboard:** Calls History UI; batch-call detail pages show per-recipient status. (A UI CSV export was not specifically verified; the API is the dependable export path.)

---

## 2. Twilio (verified 2026-11-04)

Source: https://www.twilio.com/en-us/voice/pricing/us (accessed 2026-11-04; page states rates as of August 2026).

| Item | Price |
|---|---|
| Outbound call to US local number | **$0.0140/min** |
| Inbound to local number | $0.0085/min |
| Local phone number | **$1.15/mo** |
| Answering Machine Detection (AMD) | **$0.0075 per answered call** |
| Call recording | $0.0025/min |
| Media Streams | $0.0044/min |

Notes:
- Unanswered/failed calls are generally not charged for call minutes, and AMD is charged only when the call is answered (Twilio AMD docs/blog; third-party billing test at dev.classmethod.jp, accessed 2026-11-04). Twilio voice is billed in 1-minute increments (round-up) — a 75 s call bills as 2 min. ASSUMPTION flagged in the model (§6).
- ASSUMPTION (to verify in pilot): whether the ElevenLabs native integration incurs Twilio **Media Streams** ($0.0044/min) on top of voice minutes. The HISTORICAL workbook assumed "$0.014/min + media streams"; the base model below includes it.
- **STIR/SHAKEN:** Twilio signs calls. Default/unverified = **C attestation** (more likely to be labeled "Spam Likely," tanking answer rates). Approved **Trust Hub Business Profile** → B; Business Profile + **SHAKEN/STIR Trust Product** with the number assigned → **A attestation**. Onboarding is via Twilio Console Trust Hub; vetting required. Sources: Twilio SHAKEN/STIR onboarding docs and trust page (accessed 2026-11-04). Current Trust Hub fees not confirmed — check console. Also consider CNAM/branded caller ID ("NicFinder") to raise answer rates; answer rate is the dominant economic variable (§6).
- **AMD for voicemail/IVR:** Twilio AMD returns human/machine verdicts; via ElevenLabs `twilio_machine_detection` we can auto-hang-up on `machine` verdicts (§1.2). AMD is imperfect (both false positives and ~4–8 s classification delay in async mode); the agent script must still handle voicemail that slips through (§4.3).

---

## 3. Legal / regulatory landscape

> **⚠️ REQUIRES LEGAL COUNSEL.** Nothing below is legal advice, and this document deliberately does **not** conclude that the proposed calls are categorically permitted or prohibited. A qualified TCPA/telecom attorney (with Illinois experience) must review the full program design — number acquisition, line-type scrubbing, disclosure script, recording/transcription, retention, and opt-out handling — **before the first production call**. Penalties are per-call and strict-liability-flavored: TCPA statutory damages are $500 per violation, up to $1,500 for willful/knowing violations.

### 3.1 FCC Feb 2024: AI voices are "artificial" under the TCPA (verified)

- **Declaratory Ruling, adopted/released Feb 8, 2024, CG Docket No. 23-362:** the TCPA's restrictions on "artificial or prerecorded voice" **encompass current AI technologies that resemble human voices and/or generate call content using a prerecorded voice** — i.e., an ElevenLabs conversational agent is an "artificial voice" caller. Effective immediately on release. (Sources: National Law Review; Baker McKenzie; Mayer Brown; CommLawBlog; Kelley Drye — all Feb 2024, accessed 2026-11-04.)
- The ruling is **not an outright ban**; it slots AI calls into the existing artificial/prerecorded framework: consent requirements vary by the type of line called (§3.2), and the **identification requirements of 47 C.F.R. § 64.1200(b)(1)–(2)** apply — the message must state the identity of the business responsible for the call at the beginning and provide its telephone number.

### 3.2 TCPA: business landlines vs wireless numbers

- **Wireless numbers (cell phones):** 47 U.S.C. § 227(b)(1)(A)(iii) — artificial/prerecorded-voice calls require **prior express consent** regardless of content; telemarketing to wireless requires prior express **written** consent (2013 rules). **An informational "what's your ZYN price?" AI call to a cell phone without consent is a TCPA violation under the Feb 2024 ruling's framework.** This is the program's biggest exposure, because many independent gas stations/c-stores list a personal or business **cell** number as their public phone number.
- **Residential landlines:** artificial/prerecorded calls restricted (§ 227(b)(1)(B)); post-2023 FCC rules allow limited non-telemarketing informational prerecorded calls (≤3 in 30 days) with opt-out mechanisms. Occasionally relevant: some "store" listings are home numbers.
- **Business landlines:** commentary consistently reads the TCPA as **not requiring prior consent for autodialed/prerecorded (and thus AI-voice) informational calls to business landlines** (the statute's artificial-voice provisions target wireless, residential, emergency, and patient-room lines), and the federal Do-Not-Call registry protects personal/residential numbers, not business lines. (Sources: Faegre Drinker 2013 rules summary; Business Law Today "Robocalling and Wireless Numbers"; Day Pitney 2023; accessed 2026-11-04.) **However**: (a) the caller bears the risk of misclassifying a wireless number as a business landline; (b) reassigned/ported numbers change type over time; (c) identification rules in § 64.1200(b) still apply; (d) the FTC Telemarketing Sales Rule mostly targets *sales* calls, and a pure price-inquiry call is arguably not telemarketing — but "survey/research call" characterization is exactly the kind of judgment **counsel must make, not us**.
- **Mandatory mitigation (engineering, regardless of counsel's conclusion):** scrub every target number against a wireless/line-type database (e.g., carrier line-type lookup, Twilio Lookup line-type intelligence, or a dedicated litigator/wireless scrub vendor) and **exclude wireless and unknown-type numbers entirely** unless counsel approves a consent pathway; re-scrub before every batch (ports happen); keep scrub evidence per call for defense.

### 3.3 FCC AI-disclosure rulemaking: still pending

- **NPRM + NOI, FCC 24-84, released Aug 8, 2024** (same docket, CG 23-362): proposed (i) a definition of "AI-generated call," (ii) consent-stage disclosure that future calls may use AI, and (iii) in-call requirements; comments closed Oct 10/25, 2024.
- As of **2026-11-04**, searches surfaced **no Report & Order adopting final AI-disclosure rules** — the proceeding appears still pending (verify directly on FCC ECFS, docket 23-362, before launch; agency status can change at any time). Even without final rules, voluntarily disclosing AI use (§4) is cheap insurance and matches the proposal's direction. (Sources: TCPAWorld Aug 12, 2024; Wiley alerts; JD Supra; accessed 2026-11-04.)

### 3.4 Illinois all-party consent: 720 ILCS 5/14 (eavesdropping)

- Illinois is an **all-party consent** state. Post-2014 rewrite, criminal eavesdropping under 720 ILCS 5/14-2 is recording/intercepting/**transcribing** a **"private conversation"** (one where a party has a reasonable expectation of privacy) **in a surreptitious manner** without consent of all parties. First offense: Class 4 felony (1–3 years, fines up to $25,000); **civil private right of action under 720 ILCS 5/14-6** (sources cite damages including a $10,000-per-violation figure — verify against statute text). (Sources: ilga.gov statute text 720 ILCS 5/14-2; RCFP Illinois guide; accessed 2026-11-04.)
- Implications for NicFinder:
  - **Default stance: do not record audio** (`twilio_call_recording_enabled=false`, no `post_call_audio` webhook) until counsel signs off.
  - **Transcription is explicitly within the statute's verbs** — real-time ASR/transcript retention is not automatically safe just because no MP3 is stored. The mitigation is removing surreptitiousness: the agent's **first message discloses** that the call is automated and "may be recorded or transcribed for accuracy," and proceeds only if the respondent continues/consents (§4.2). A clerk quoting a shelf price to any caller plausibly lacks a reasonable expectation of privacy — but **do not rely on that theory without counsel**.
  - If counsel approves recording-with-disclosure, log the disclosure utterance + timestamp per call as consent evidence.
- **Also Illinois-specific — ⚠️ REQUIRES LEGAL COUNSEL:** the **Illinois Automatic Telephone Dialers Act, 815 ILCS 305**, regulates autodialed/prerecorded-message calls: playing a prerecorded message placed by an autodialer **without the called party's consent** is a violation, with required up-front identification of the business and purpose, consent inquiry, and operator recordkeeping (P.A. 98-0546). Whether an interactive AI agent (not a fixed prerecorded message) and a batch-dial system fall within its definitions is unsettled — counsel question. (Sources: ilga.gov / Justia 815 ILCS 305 texts, accessed 2026-11-04.)
- Cross-state caution: calling from/into other states later brings other two-party-consent states (CA, FL, PA, WA, …) and state mini-TCPA statutes (FL, OK, WA, etc.) into play. Chicago pilot keeps this contained but does not eliminate it (caller location, platform location).

### 3.5 Opt-out / do-not-call handling (program policy)

- Maintain an **internal suppression list** keyed by phone number + external_store_id. Any of: "take us off your list," "don't call again," a refusal with irritation, or a store manager request → suppress immediately and permanently (until written re-permission). Honor within 24 h across all batches; suppress before every batch job.
- Even where the national DNC registry does not cover business numbers, honoring opt-outs is required by basic decency, platform ToS (ElevenLabs batch docs warn on TCPA/state law), and reduces complaint-driven carrier blocking of our caller ID.
- Frequency cap: max 1 attempt-cluster per store per refresh period (e.g., up to 2 retries on no-answer within a day, then stop until next cycle).
- Calling hours: 10:00–17:00 America/Chicago, store-local business hours only; never holidays.

---

## 4. Truthful agent identity and call script

### 4.1 Rejecting the historical prompt

The historical prompt had the agent pose as **"a normal 25-year-old guy."** That is **rejected and must never ship**:

- It is deceptive impersonation of a human — contrary to the FCC's direction of travel (§3.3), § 64.1200(b) identification duties, ElevenLabs' terms for agent conduct, and NicFinder's own credibility (data provenance we can publicly stand behind).
- It poisons the dataset: prices extracted under false pretenses are a reputational and potentially legal liability for a consumer-facing site.
- Transparency costs seconds of extra talk time (~10–15 s, priced into §6) and is non-negotiable.

### 4.2 Disclosure-first script (draft for counsel review)

**First message (agent speaks first — configured as the agent's first message):**

> "Hi! Quick heads-up: I'm an **automated assistant** — an AI — calling on behalf of **NicFinder**, a free price-comparison service for nicotine pouch shoppers in Chicago. This call may be transcribed for accuracy. I just have one quick question about a shelf price — it takes about twenty seconds. Is that okay?"

- If **no / busy / hang-up** → "No problem, thanks for your time!" End call. Log `refused`.
- If **yes / sure / go ahead** →

**Core question (standard ZYN):**

> "Thanks! What do you charge for a single can of **ZYN nicotine pouches** — the regular 15-count can, any flavor?"

**Follow-ups (only if the respondent is still engaged):**

1. **ZYN Ultra:** "And do you carry **ZYN Ultra**? If so, what's a can of that?"
2. **Quantity deals:** "Any multi-can deals — like **buy 5 cans, get a dollar off each**, or a 3-can price?"
3. **Tax check (only if ambiguous):** "Is that price before tax?"

**Confirmation of ambiguous answers (always, before ending):**

> "Just to confirm: regular ZYN is **$X.XX** a can before tax, and the deal is **[restate]** — did I get that right?"

- Mishears, mumbled prices, "like five-ish," register-check pauses → re-ask once, confirm once; if still unclear, record with low confidence rather than re-ask a third time.

**Close:**

> "Perfect, thank you! If you'd ever like us to stop calling, just say so now or call us back at **[callback number]**. Have a great day!"

### 4.3 Edge-case handling matrix

| Situation | Behavior | Logged outcome |
|---|---|---|
| **IVR / phone tree** | Politely attempt "press 0"/"representative" once via DTMF if the agent supports it; otherwise say nothing misleading, wait ≤20 s for a human, then hang up | `ivr_no_human`, availability `unknown` |
| **Voicemail (AMD verdict)** | Hang up via `twilio_machine_detection` hang-up rule before agent engages — **no message** (preferred, cheapest) | `voicemail` |
| **Voicemail (slips past AMD)** | Either hang up silently or leave one brief honest message: "Hi, this was an automated call from NicFinder, a price-comparison service — nothing needed, we'll try another time." Never a fake-person message | `voicemail` |
| **No answer** | Hang up at ringing timeout (25–30 s). Max 2 retries that day, then wait for next cycle | `no_answer` |
| **Busy** | `call_initiation_failure: busy` webhook; one retry after ≥2 h | `busy` |
| **Refusal / "don't call"** | Thank, end immediately, add to suppression list | `refused` (+ suppression) |
| **"We don't carry ZYN"** | "Good to know — thanks!" End. This is valid data | availability `not_carried` |
| **Early hang-up mid-answer** | Never call back same day; record partial data at reduced confidence | partial, low confidence |
| **Respondent is clearly a minor or confused** | End politely, discard call data | discarded |
| **Respondent asks questions about NicFinder** | Short honest answer + callback number; never improvise claims | noted |
| **Price gouging/suspicious quote (e.g., $1 or $40)** | Confirm once ("$40 for one can, is that right?"); flag for human review | low confidence + review flag |

Hard limits in agent config: max call duration ~3 min; never discuss anything beyond prices/availability; never collect personal data about the respondent; never negotiate, purchase, or reserve product.

---

## 5. Operational design

### 5.1 Target-store selection

- **Source of truth:** NicFinder's existing Chicago store table (Google Places / OSM seeded), each row carrying `external_store_id`, name, address, lat/lon, phone.
- **Eligibility pipeline (per batch):** has phone → E.164-normalized → **line-type scrub passes (business landline/fixed VoIP only; wireless & unknown excluded** per §3.2) → not on suppression list → not called successfully within current refresh window → store-local time within calling hours.
- **Prioritization:** stores by page-view demand on the site; stale observations first; new stores next; stable-price chains (e.g., corporate 7-Eleven) deprioritized if a chain-level source exists (§7).

### 5.2 Refresh cadence

- ZYN shelf prices at c-stores change infrequently (weeks–months; excise-tax changes and promos are the movers). Recommended: **monthly refresh baseline**, weekly only for high-traffic stores and stores with recent price variance; immediate re-queue when users flag a price as wrong on the site. This cuts cost ~4× vs all-weekly (§6) with little freshness loss.
- Display the `observed_at` date on the site ("phone-verified Oct 28") — honesty about staleness is itself a feature.

### 5.3 Post-call normalization, confidence, provenance

Webhook receiver pipeline (per `post_call_transcription` event):

1. **Verify** HMAC signature + timestamp; dedupe on `conversation_id`.
2. **Join** to the batch row via the `external_store_id` dynamic variable (round-trips in `conversation_initiation_client_data`); store `conversation_id` + Twilio `callSid` as provenance.
3. **Normalize:** prices → USD decimal, 2 places; sanity bounds (standard ZYN plausible retail band, e.g., $3.50–$9.99; Ultra band distinct; outside band → `review` queue, confidence capped at 0.4); deals normalized to (`deal_min_qty`, `deal_price_per_can_usd`, `deal_total_usd`, free-text `deal_conditions`); `tax_included` defaults to `false` in Chicago (prices are customarily pre-tax) **only when the agent asked and got "before tax"** — otherwise `unknown`.
4. **Confidence score (0–1), rule-based v1:** start 0.5; +0.3 respondent confirmed the read-back; +0.1 price inside plausible band; +0.1 call ≥30 s with human verdict; −0.2 partial/early hang-up; −0.2 data-collection field came back null but transcript mentions a number (extraction disagreement → review). Publish to site only at ≥0.7; 0.4–0.69 → hold for second call next cycle; <0.4 → discard.
5. **Provenance:** every published price links internally to {conversation_id, callSid, observed_at, agent version, prompt version, extraction schema version}. Transcript retention policy per counsel (§3.4).

### 5.4 Output CSV (importer contract)

One row per (call × product_line). Header, exactly:

```csv
source_row_id,external_store_id,call_id,store_name,address,latitude,longitude,phone,observed_at,product_line,price_usd,tax_included,availability,confidence,deal_min_qty,deal_price_per_can_usd,deal_total_usd,deal_conditions,notes
```

Field rules:

| Column | Rule |
|---|---|
| `source_row_id` | unique per CSV row (e.g., `{call_id}-{product_line}`) |
| `external_store_id` | NicFinder store key (round-tripped dynamic variable) |
| `call_id` | ElevenLabs `conversation_id` (Twilio `callSid` goes in `notes` or a side table) |
| `store_name`,`address`,`latitude`,`longitude`,`phone` | echoed from store table at call time (snapshot, not live join) |
| `observed_at` | ISO 8601 **with offset, America/Chicago**, e.g. `2026-11-04T14:22:05-06:00` |
| `product_line` | `zyn` \| `zyn_ultra` |
| `price_usd` | decimal(5,2) or empty when unknown/not carried |
| `tax_included` | `true` \| `false` \| `unknown` |
| `availability` | `in_stock` \| `out_of_stock` \| `not_carried` \| `unknown` |
| `confidence` | 0–1, two decimals |
| `deal_min_qty`,`deal_price_per_can_usd`,`deal_total_usd` | empty when no deal; e.g. "buy 5, $1 off each" at $5.49 base → `5`, `4.49`, `22.45` |
| `deal_conditions` | free text ("same flavor only", "with rewards card") |
| `notes` | free text; escape per RFC 4180 |

---

## 6. Economics

### 6.1 HISTORICAL baseline (April 2026 — project workbook; MUST BE REVALIDATED)

> Labeled HISTORICAL. These are the owner's April 2026 observations, not current facts: ElevenLabs Creator tier ~$22/mo at ~$0.09–0.12/min; Twilio ~$0.014/min outbound + media streams; observed call credit costs 24–995 credits/call, average ~274 credits across ~29 test calls; average successful ask ~37 s; owner modeled ~$0.07/call and **~$0.108/store-observation at a 35% failure rate**.

Deltas vs today: ElevenLabs now posts a flat **$0.08/min** (cheaper than the historical ~$0.09–0.12); Twilio $0.014/min unchanged; our disclosure-first script (§4.2) makes successful calls **longer** than the historical 37 s — assume 60–90 s.

### 6.2 Current unit-cost model (verified prices, editable assumptions)

**Verified inputs (2026-11-04):** EL $0.08/min; Twilio $0.014/min (billed per started minute); AMD $0.0075/answered call; Media Streams $0.0044/min (inclusion uncertain — kept in, see §2); number $1.15/mo.

**Editable assumptions (ranges per brief):** success rate **s = 50–70%** (base 60%); successful call **40–90 s** (base 75 s incl. disclosure); failed-but-answered call (voicemail/IVR/refusal) 25 s; share of attempts never answered (no Twilio minute, no AMD fee) folded into the failure bucket — model conservatively bills every failed attempt as answered; EL assumed per-second prorated (flag: if EL bills whole minutes, EL cost rises ~40%).

Per **attempt** (base case): EL = 0.6×(75/60)×$0.08 + 0.4×(25/60)×$0.08 = $0.060 + $0.013 = **$0.073**. Twilio = 0.6×2 min×$0.014 + 0.4×1 min×$0.014 + $0.0075 AMD + ~1.08 min×$0.0044 streams ≈ **$0.035**. LLM ≈ **$0.01** (assumption; measure). **Total ≈ $0.118/attempt.**

Per **successful observation** = attempt cost ÷ s:

| Scenario | s | Successful call | $/attempt | **$/successful observation** |
|---|---|---|---|---|
| Optimistic | 70% | 40 s | $0.085 | **$0.12** |
| **Base** | **60%** | **75 s** | **$0.118** | **$0.20** |
| Pessimistic | 50% | 90 s | $0.132 | **$0.26** |

(Headline: **≈ $0.15–$0.30, base ≈ $0.19–0.20** per observation — vs HISTORICAL $0.108 with shorter calls and lower measured failure.)

### 6.3 Fleet scenarios (base-case unit costs; EL plan chosen per volume; +Twilio number $1.15/mo)

Minutes per attempt ≈ 0.92 EL-min (base case). Attempts = stores ÷ 0.6. Monthly refresh = 1 cycle/mo; weekly = 4.33 cycles/mo.

| Stores | Cadence | Attempts/mo | EL min/mo | EL plan + overage | Twilio+LLM | **≈ Total/mo** | **$/obs** |
|---|---|---|---|---|---|---|---|
| 100 | monthly | 167 | ~153 | Creator $22 (covers) | ~$8 | **~$30** | $0.30* |
| 100 | weekly | 722 | ~662 | Creator $22 + $31 | ~$33 | **~$86** | $0.20 |
| 1,000 | monthly | 1,667 | ~1,528 | Pro $99 (covers) | ~$75 | **~$175** | $0.18 |
| 1,000 | weekly | 7,217 | ~6,615 | Scale $299 + $230 | ~$325 | **~$855** | $0.20 |
| 10,000 | monthly | 16,667 | ~15,278 | Business $990 + $232 | ~$750 | **~$1,975** | $0.20 |
| 10,000 | weekly | 72,167 | ~66,153 | Business $990 + $4,302 | ~$3,250 | **~$8,545** | $0.20 |

\* small-volume $/obs dominated by the plan floor. At 10k-weekly scale, negotiate Enterprise pricing; also check concurrency/time-box: Business tier = 40 concurrent; batch cap = min(50% workspace, 70% agent) ≈ 20 → ~72k attempts × ~0.92 min ÷ 20 lines ≈ 55 h of dialing/mo — fits easily in business-hours windows. On Creator (10 concurrent → batch ~5), 722 attempts/mo ≈ 2.2 h — fine.

**Sensitivity:** answer/success rate is the lever — every 10-point drop in s adds ~20% to $/obs. Spam-labeling (STIR/SHAKEN attestation, §2) therefore directly moves unit economics; budget the Trust Hub registration effort as an economic measure, not just compliance.

**Not in the model:** line-type scrub (~$0.003–0.01/number/cycle via lookup APIs — verify vendor pricing), legal review (one-time + per-change), webhook hosting (negligible), human review of low-confidence calls (real cost at scale — est. 5–10% of calls × ~1 min of human time).

---

## 7. Alternatives if calling is too costly or unpopular

| Approach | Pros | Cons |
|---|---|---|
| **Crowdsourcing (GasBuddy model)** — users submit shelf prices in-app for points/perks | Near-zero marginal cost; scales with traffic; legally simple; community moat | Cold-start chicken-and-egg; spam/fraud moderation; sparse coverage of low-traffic stores; freshness uneven |
| **Retailer partnerships / POS data** — chains (7-Eleven, Circle K, Casey's) or POS/scan-data aggregators feed prices directly | Highest accuracy & freshness; zero legal exposure; bulk coverage per deal | Long BD cycles; chains may see no upside (price transparency); tobacco-category data sensitivity; independents rarely have shareable POS feeds |
| **Web scraping of store/chain sites** — chain locators, e-commerce (gopuff-style), ZYN.com store locator | Cheap, automatable, broad | Most c-stores don't publish tobacco prices online; ToS/anti-bot issues; locator shows carriage, rarely price |
| **Delivery-app data (Gopuff, DoorDash/Uber Eats convenience listings)** | Real prices, machine-readable, frequently updated | Delivery markups ≠ shelf price (systematic +15–30% bias); nicotine often geo-restricted/absent on these apps; ToS restrictions on scraping |
| **Hybrid (recommended hedge)** | Calls seed the map → crowdsourcing maintains it → partnerships replace calls per-chain | Orchestration complexity |

Practical read: calling is best as a **bootstrap and verification tool** (seed 1,000 stores once, spot-verify crowdsourced outliers), not necessarily as the permanent refresh engine at 10k-weekly scale.

---

## 8. Step-by-step future integration roadmap

**Phase 0 — Legal gate (blocks everything)**
1. Engage TCPA/telecom counsel (Illinois-licensed or with IL co-counsel). Deliverables: written opinion on (a) AI-voice informational calls to business landlines post-Feb-2024 ruling; (b) wireless-scrub standard of care; (c) Illinois 720 ILCS 5/14 posture for transcription with up-front disclosure, and recording yes/no; (d) 815 ILCS 305 applicability; (e) approved disclosure script (§4.2 as draft); (f) retention policy. **⚠️ No production call before this.**
2. Check FCC ECFS docket 23-362 for a final AI-disclosure Report & Order; set a quarterly re-check.

**Phase 1 — Accounts & credentials**
3. ElevenLabs workspace (start Creator $22/mo), API key scoped minimally; enable workspace post-call webhooks with HMAC secret stored in secrets manager.
4. Twilio account: buy one Chicago local number ($1.15/mo); create **limited-permission API key** for the ElevenLabs import (§1.1); complete **Trust Hub Business Profile + SHAKEN/STIR Trust Product**, assign the number (target A attestation); investigate CNAM "NicFinder".
5. Line-type scrub vendor account (Twilio Lookup or equivalent).

**Phase 2 — Build (est. 1–2 weeks of dev)**
6. Agent config: system prompt (truthful identity, §4 rules), first message = disclosure script, data-collection schema (§1.3), max duration 3 min, analysis criteria; version-control the prompt JSON in this repo.
7. Import Twilio number into ElevenLabs (native integration).
8. Batch scheduler: cron job that builds the recipient CSV (eligibility pipeline §5.1, suppression check, calling-hours window America/Chicago) and submits via the batch-call API; per-call fallback to `POST /v1/convai/twilio/outbound-call` with `twilio_machine_detection` hang-up rules and `ringing_timeout_secs≈30`.
9. Webhook receiver: verify signature → persist raw payload → normalization + confidence pipeline (§5.3) → emit importer CSV (§5.4) → suppression-list updater (refusals) → alerting on webhook failures (auto-disable at 10 consecutive failures, §1.4).
10. Ops dashboard: per-batch answer rate, success rate, $/obs, low-confidence review queue.

**Phase 3 — Testing (consenting numbers ONLY)**
11. Unit-test extraction with synthetic transcripts; dry-run batch with 0 recipients.
12. **Live tests exclusively against numbers we own or whose owners have given documented consent** (own cell/landline/Google Voice, friends' phones with written OK, a rented test IVR). Script every edge case in §4.3: voicemail, IVR, refusal, ambiguous price, early hang-up, "don't carry it." Measure: real EL billing granularity (per-second?), whether Media Streams charges appear, AMD accuracy and latency, end-to-end webhook → CSV correctness.
13. Re-estimate §6 model from measured data; counsel reviews actual call recordings/transcripts of test calls.

**Phase 4 — Pilot (only after Phase 0 sign-off)**
14. 25–50 real stores, monthly cadence, manual review of **every** call for 2 cycles; track complaints, opt-outs, spam-labeling of our number.
15. Go/no-go vs alternatives (§7) on measured $/obs, data quality, and complaint rate; scale plan tier per §6.3 only on go.

---

## 9. Sources (all accessed 2026-11-04)

**ElevenLabs (official)**
- Twilio native integration — https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/native-integration
- Outbound-call API — https://elevenlabs.io/docs/eleven-agents/api-reference/integrations/twilio/outbound-call
- Data collection — https://elevenlabs.io/docs/eleven-agents/customization/agent-analysis/data-collection
- Post-call webhooks — https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks
- Batch calling — https://elevenlabs.io/docs/eleven-agents/phone-numbers/batch-calls
- Agents pricing — https://elevenlabs.io/pricing/agents
- List conversations API — https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/list

**Twilio (official)**
- US Voice pricing (rates stated as of Aug 2026) — https://www.twilio.com/en-us/voice/pricing/us
- SHAKEN/STIR onboarding — https://www.twilio.com/docs/voice/trusted-calling-with-shakenstir/shakenstir-onboarding/shakenstir-onboarding-in-the-twilio-console
- SHAKEN/STIR trust page — https://twilio.com/trust/shaken-stir
- AMD GA announcement ($0.0075/answered call) — https://www.twilio.com/en-us/blog/answering-machine-detection-generally-available

**FCC / TCPA**
- FCC Feb 8, 2024 Declaratory Ruling coverage: https://natlawreview.com/article/fcc-issues-declaratory-ruling-tcpa-applies-ai-generated-voice-calls ; https://connectontech.bakermckenzie.com/hanging-on-the-telephone-fcc-deems-ai-robocalls-without-consent-illegal-under-the-tcpa ; https://www.mayerbrown.com/en/insights/publications/2024/02/fcc-declares-authority-and-intent-to-regulate-ai-generated-calls-under-the-tcpa ; https://www.commlawblog.com/2024/02/articles/fcc/fcc-clarifies-that-ai-generated-voices-are-subject-to-tcpa/ ; https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/fcc-declares-tcpa-restrictions-apply-to-ai-generated-calls
- AI-disclosure NPRM (FCC 24-84, Aug 8 2024; no final rule found as of 2026-11-04): https://tcpaworld.com/2024/08/12/new-fcc-ai-regulations-the-fcc-adopts-mandatory-disclosure-requirements-for-ai-generated-calls-and-texts/ ; https://www.wiley.law/alert-FCC-Sets-October-Comment-Deadlines-on-NPRM-for-AI-Generated-Calls-and-Texts ; status check: https://www.fcc.gov/ecfs (docket CG 23-362)
- Business vs residential vs wireless line rules: https://www.faegredrinker.com/en/insights/publications/2013/10/new-tcpa-rules-take-effect-on-october-16-2013 ; https://businesslawtoday.org/2013/05/robocalling-and-wireless-numbers-understanding-the-regulatory-landscape/ ; https://www.daypitney.com/insights/publications/2023/01/12-tcpa-revisions-fcc-prerecorded-voice-message-calling (older commentary — current rule text: 47 C.F.R. § 64.1200)

**Illinois**
- 720 ILCS 5/14-2 (eavesdropping) — https://www.ilga.gov/Documents/legislation/ilcs/documents/072000050K14-2.htm ; RCFP Illinois recording guide — https://www.rcfp.org/reporters-recording-guide/illinois/
- 815 ILCS 305 (Automatic Telephone Dialers Act) — https://law.justia.com/codes/illinois/chapter-815/act-815-ilcs-305/

**Historical (internal)**
- NicFinder project workbook, April 2026 (ElevenLabs Creator ~$22/mo @ ~$0.09–0.12/min; Twilio ~$0.014/min + media streams; 24–995 credits/call, avg ~274; ~29 test calls; ~37 s avg successful ask; ~$0.07/call; ~$0.108/store-observation @ 35% failure). HISTORICAL — revalidate before use.

**Third-party pricing corroboration (lower reliability)**
- https://www.cloudzero.com/blog/elevenlabs-pricing/ ; https://www.happyrobot.ai/hub/elevenlabs-pricing ; https://dev.classmethod.jp/en/articles/twilio-call-api-unanswered-ringing-billing-verification/ (unanswered calls not billed)

---

*End of document. Before any production call: Phase 0 legal gate (§8) is a hard blocker.*
