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
   `corroborationsRequired` (2) *independent* members (distinct users,
   excluding the proposer; duplicate submissions by one user don't count)
   report the same price. A member who submits the same price as an open
   proposal is automatically counted as a corroborator. Moderators can also
   approve or reject any waiting proposal.

Publishing supersedes the previous ACTIVE observation (history retained)
and creates a `COMMUNITY` observation tied to the contribution.

## Reputation events

| Event | Δ | Notes |
| --- | --- | --- |
| Replacement published (auto/corroborated/approved) | **+5** | |
| Confirmation of a current, non-expired observation | **+2** | Confirming expired data earns **0** |
| Your confirmed price is replaced within 7 days | **−3** | "Stale confirm" — the price was already wrong |
| Replacement rejected by moderation | **−8** | Rejection requires a written reason |
| Abuse penalty (admin suspension) | **−15** | Sessions revoked |

Reputation is the sum of `ReputationEvent` rows (auditable), cached on the
user. Confirmation *weights* decay with a `confirmationHalfLifeDays`
half-life (45d) so old agreement doesn't dominate.

## Abuse defenses

- **Self-confirmation**: you cannot confirm your own community-reported
  observation, or corroborate your own proposal (enforced + tested).
- **One verification per user per observation** (DB unique constraint), and
  a `reconfirmCooldownDays` (3d) cooldown per store/product lineage.
- **Rate limits**: `contributionRateLimitPerHour` (6) and
  `commentRateLimitPerHour` (10) per account; IP-based limits on signup and
  login.
- **New-account damping**: trusted auto-publish additionally requires 7
  days of account age, so a farmed account with gifted reputation still
  can't instantly rewrite prices.
- **Freshness honesty**: confirming expired observations earns nothing, so
  credibility can't be farmed on dead listings.
- **Review queue**: everything guardrail-tripping lands at /admin/review;
  every moderator decision records a `ModerationAction` with a reason, and
  price-affecting actions also write `AuditEvent`s.
- Multi-account sockpuppeting is mitigated (not eliminated) by the
  independence rule + account-age damping + rate limits; stronger signals
  (IP/device clustering, geo plausibility) are listed in `ROADMAP.md`.

## Comments

Store notes are deliberately lightweight: visible by default, author
deletion, member reporting (auto-hidden at `autoHideReportCount`, default
3, pending review), moderator hide/restore. Comments earn **no
reputation** — they're context, not evidence, and granting points would
invite spam.
