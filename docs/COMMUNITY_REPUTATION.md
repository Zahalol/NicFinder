# Community reputation & verification

How NicFinder decides when a community report becomes the displayed price,
and how contributor credibility rises and falls. Implementation:
`src/lib/reputation.ts` (+ `src/app/api/stores/[id]/contributions/route.ts`);
tests: `tests/reputation.test.ts`. **Every threshold is configurable at
/admin/settings** (stored in the `Setting` table; defaults in
`src/lib/settings.ts`).

## Contribution types

- **Confirm** — "the displayed price was right when I visited." Recorded as
  a `Verification` on that specific observation.
- **Dispute** — "the price is actually X." A proposed replacement, held as a
  `Contribution` until it publishes, is corroborated, or is reviewed.

## Publication decision for a dispute

Evaluated in order (`decideDispute`, pure and unit-tested):

1. **Sanity guardrail** — proposed price outside
   `priceSanityMinCents..priceSanityMaxCents` ($1.00–$25.00 default) →
   **moderator review**. Always, for everyone.
2. **Drastic-change guardrail** — change beyond
   `maxTrustedPriceChangeRatio` (±50% default) of the current price →
   **moderator review**. Always, for everyone.
3. **Trusted path** — reputation ≥ `trustedReputation` (50) **and** account
   ≥ 7 days old → **publishes immediately** (within the guardrails above).
4. **Everyone else** → **corroboration**: the proposal publishes when
   `corroborationsRequired` (2) *independent* members report the same
   price. Independent = distinct accounts (excluding the proposer;
   duplicate submissions by one user don't count) **on distinct networks**:
   corroborators sharing a salted `ipHash` count once, and none may share
   the proposer's hash. A null hash (unknown origin, legacy rows) still
   counts, so the rule tightens without bricking corroboration. A member
   who submits the same price as an open proposal is automatically counted
   as a corroborator. Moderators can also approve or reject any waiting
   proposal — but never approve their **own** contribution (400; another
   moderator must review it). Approving an already-resolved proposal
   returns 409.
5. **Staleness guard** — at publish time (any path), if a newer
   observation for that store+product exists than the proposal's creation
   time, the proposal is resolved `REJECTED` with an "Outdated" note
   instead of publishing (a moderator approval gets 409). No reputation
   change.
6. **Expiry** — proposals still uncorroborated after 21 days are resolved
   `REJECTED` ("Expired") by the maintenance job, so a months-old price
   can't publish later. No reputation change.

Publishing supersedes the previous ACTIVE observation (history retained)
and creates a `COMMUNITY` observation tied to the contribution.

## Reputation events

| Event | Δ | Notes |
| --- | --- | --- |
| Replacement published (auto/corroborated/approved) | **+5** | |
| Confirmation of a current, non-expired observation | **+2** | Confirming expired data earns **0** |
| Your confirmed price is replaced within 7 days | **−3** | "Stale confirm" — the price was already wrong |
| Replacement rejected by moderation | **−8** | Rejection requires a written reason |
| Observation/deal flag upheld | **+3** | Flag on a specific listed observation or deal, confirmed by a moderator |
| Observation/deal flag dismissed | **−2** | Mild cost so spam-flagging isn't free; reason required |
| Deal report published | **+4** | Community-reported multi-can deal approved by a moderator |
| Deal report rejected | **−2** | Reason required |
| Abuse penalty (admin suspension) | **−15** | ADMIN-only; state-gated (suspending a non-active user → 409, so penalties can't stack); admins can't be suspended; sessions revoked |

Reputation is the sum of `ReputationEvent` rows (auditable), cached on the
user; the maintenance job reconciles the cache against the ledger.
`confirmationHalfLifeDays` (45d) and the `confirmationWeight()` decay
helper exist but are **not applied at runtime yet** — only unit tests call
the helper; confirmations currently count unweighted.

## Abuse defenses

- **Self-confirmation**: you cannot confirm your own community-reported
  observation, or corroborate your own proposal (enforced + tested).
- **One verification per user per observation** (DB unique constraint), and
  a `reconfirmCooldownDays` (3d) cooldown per store/product lineage.
- **Rate limits**: `contributionRateLimitPerHour` (6) and
  `commentRateLimitPerHour` (10) per account; comment edits 20/h per
  account; IP-based limits on signup (10/h) and login (20/15 min), plus a
  per-email limit on failed logins (10/15 min).
- **New-account damping**: trusted auto-publish additionally requires 7
  days of account age, so a farmed account with gifted reputation still
  can't instantly rewrite prices.
- **Freshness honesty**: confirming expired observations earns nothing, so
  credibility can't be farmed on dead listings.
- **Review queue**: everything guardrail-tripping lands at /admin/review;
  every moderator decision records a `ModerationAction` with a reason, and
  price-affecting actions also write `AuditEvent`s.
- Multi-account sockpuppeting is mitigated (not eliminated) by the
  network-distinct independence rule (salted `ipHash`, raw IPs never
  stored) + account-age damping + rate limits; stronger signals (device
  clustering, geo plausibility) are listed in `ROADMAP.md`.

## Flags, deal reports and notifications (added 2026-11-05)

- **Observation flags** (`FLAG_OBSERVATION`): any signed-in member can flag a
  specific listed observation — current or historical — as wrong. Flags never
  auto-publish; a moderator upholds (observation `INVALIDATED`, append-only,
  the reason kept as provenance) or dismisses with a reason. One flag per
  user per observation, including after dismissal.
- **Deal flags** (`FLAG_DEAL`): same model for quantity deals, resolved as
  *ended* (`EXPIRED` — it existed) or *invalid* (`INVALIDATED` — bad data).
- **Deal reports** (`REPORT_DEAL`): members propose multi-can deals (min qty,
  per-can price XOR discount, conditions). Always moderator-reviewed; approval
  creates a `COMMUNITY` QuantityDeal that supersedes same-quantity deals and
  never extrapolates `appliesAboveMinQty`.
- **Notifications** (in-app only, no email): watchers of a saved store get a
  collapsed price-change alert (one unread per store, newest wins); reporters
  get per-event resolution notices (published/rejected/upheld/dismissed, with
  the moderator's note on negative outcomes). Trusted auto-publishes don't
  self-notify. Committed imports also send price-change alerts to watchers
  of matched stores, and signed-in coverage requesters are notified when
  their ZIP gains its first priced store (from a community publish or an
  import).
- **Confirmations require a price**: availability-only observations
  ("not carried", no price) cannot be confirmed — there is no price to vouch
  for.

## Comments

Store notes are deliberately lightweight: visible by default, author
deletion and editing (marked "(edited)"), member reporting (one report per
user per comment — auto-hidden at `autoHideReportCount` **distinct**
reporters, default 3, pending review), moderator hide/restore. Both are
state-gated (hide only VISIBLE, restore only HIDDEN; otherwise 409) and
both clear the report ledger, so old reports can't instantly re-hide a
restored comment. A comment its author DELETED can never be restored.
Comments earn **no reputation** — they're context, not evidence, and
granting points would invite spam.
