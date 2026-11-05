# Import contract (v1)

The website treats price acquisition as an external concern: a separate
system (future ElevenLabs calling pipeline, a data partner, or a human with
a spreadsheet) periodically produces a **CSV or XLSX file of store/price
observations**, and an admin uploads it at **/admin/imports**. This document
is the contract for that file. The ingestion engine is brand-agnostic —
product lines come from the database, so the same file format serves future
brands.

Machine-readable definitions: `src/lib/import/contract.ts`.

## File format

- `.csv` (UTF-8, header row) or `.xlsx` (first worksheet, header row 1).
- ≤ 10,000 data rows, ≤ 5 MB per upload. An `.xlsx` sheet larger than
  50,000 rows × 200 columns is refused before row parsing.
- One row = one observation of one product line at one store. A store
  observed for both regular ZYN and ZYN Ultra produces **two rows**.
- Sample files: `sample-data/sample-import.csv` and `.xlsx` (fictional
  stores, deliberately including a flagged, a rejected, and a duplicate row).

## Columns

Canonical names below; headers are matched case/punctuation-insensitively
and through aliases (e.g. `PhoneNumber`, ` Store Name`, `ZYN Price`,
`Last Call` all map). Unrecognized columns are reported and can be mapped
manually in the preview UI. All optional unless marked required.

### Store identity

At least one of `store_name`, `external_store_id`, `phone` or `address` is
required; a row with only `city`/`state`/`zip`/coordinates is rejected
(`NO_STORE_IDENTITY`).

| Column | Type | Notes |
| --- | --- | --- |
| `external_store_id` | string | Stable ID from the producing system. **Strongly recommended** — authoritative for matching. |
| `store_name` | string | |
| `address` | string | Street address; full "street, city, ST zip" also accepted |
| `city` / `state` / `zip` | string | `state` 2-letter; `zip` 5-digit |
| `latitude` / `longitude` | decimal degrees | WGS84; out-of-range → row rejected |
| `phone` | string | Any US format; normalized to E.164 |

### Observation

| Column | Type | Notes |
| --- | --- | --- |
| `hours` | string | Optional free-text opening hours (e.g. "Mon–Sat 6am–11pm"); longer than 120 chars is truncated, not rejected. Sets hours on new stores and updates them on matched stores; display-only. |
| `observed_at` | ISO 8601 datetime, **required** | When the price was observed (not exported). Include a UTC offset (`2026-11-01T14:05:00-06:00`); naive timestamps are interpreted by the server JS runtime and should be avoided. More than 1 day in the future, or pre-2000 → rejected. |
| `product_line` | slug | `zyn` or `zyn-ultra` (more may exist in DB). Unknown value → rejected. **Omitted** → attached to the regular line with confidence capped at 0.6 and an explanatory note; never attributed to Ultra. |
| `price_usd` | decimal, ≥0, ≤2dp | Regular single-can shelf price. `$`/commas tolerated. Outside $1.00–$25.00 → **flagged** for review, not published. **May be blank** for availability-only rows (see `availability`): the row records a price-less observation and no price is ever invented. A row with no price, no deal and no explicit availability asserts no fact → **flagged**. |
| `currency` | string | Only `USD` (default). Anything else → rejected. |
| `tax_included` | `true/false/yes/no/1/0` | Blank = unknown (never assumed). |
| `availability` | `in_stock` \| `out_of_stock` \| `not_carried` \| `unknown` | Aliases accepted (`in stock`, `oos`, `does not carry`, …; `yes` → in stock, `no` → not carried). Any other value → rejected (`BAD_AVAILABILITY`). With a blank `price_usd`, an explicit value here creates an **availability-only observation** (e.g. a store that doesn't carry ZYN) — shown on the site as "Not carried"/"Out of stock", never as a price. |
| `confidence` | 0–1 | Producer's confidence in the extraction. Outside 0–1 → rejected (`BAD_CONFIDENCE`). |
| `strength` / `flavor` / `can_size` | string | Optional variant detail. |

### Quantity deal (all-or-nothing group)

| Column | Type | Notes |
| --- | --- | --- |
| `deal_min_qty` | int 2–100 | Required if any deal field present. |
| `deal_price_per_can_usd` | decimal | Per-can price at qty, $1.00–$25.00. **Either** this |
| `deal_discount_per_can_usd` | decimal | **or** this ($0.01–$24.00 per can) — not both. |
| `deal_applies_above_min_qty` | bool | Blank = unknown → the UI will not extrapolate beyond `min_qty`. |
| `deal_conditions` | string | Loyalty/membership/etc., verbatim. |
| `deal_expires_at` | ISO 8601 | Pre-2000 or more than 5 years ahead → rejected. |

### Provenance

| Column | Type | Notes |
| --- | --- | --- |
| `source_row_id` | string | Producer's row key. |
| `call_id` | string | Stored on the observation (`externalCallId`). |
| `notes` | string | Free text, stored verbatim. |

## Processing semantics

1. **Preview first.** Upload creates a `PREVIEW` batch with per-row
   outcomes; nothing touches stores/prices until an admin commits. Rows are
   revalidated at commit time against current DB state.
2. **Outcomes:** `ACCEPTED` (new store + observation), `UPDATED` (matched an
   existing store), `SKIPPED_DUPLICATE`, `FLAGGED` (quarantined: ambiguous
   store match, out-of-sanity price, or a row asserting no fact — needs
   manual action), `REJECTED`
   (malformed; never applied). Counts are reported per batch; a CSV error
   report is downloadable.
3. **Store matching**, in order: `external_store_id` identity → unique
   phone (overridden if the row's address clearly identifies a different
   known store — shared corporate phone lines exist) → normalized address →
   coordinates within 75 m with name similarity. Multiple plausible
   candidates → `FLAGGED`, never guessed. New stores created near existing
   ones also open a **duplicate candidate** for admin review.
   **In-batch dedupe:** several rows describing the same *new* store (same
   identity, e.g. two observation dates or two product lines) create ONE
   store; later rows carry an informational `NEW_STORE_SHARED` issue and
   attach their observations to it.
4. **Idempotency:** the file's SHA-256 is stored; re-committing an identical
   file applies nothing (commits of the same content serialize on a
   Postgres advisory lock, so even concurrent commits apply once).
   Independently, each row carries a content hash, so the same observation
   arriving in two different files is also skipped. Verification counts are
   never inflated by re-imports.
   **Field bounds:** these reject the row with `FIELD_TOO_LONG` when
   exceeded: `store_name` 120, `address` 200, `state` 2,
   `external_store_id` 80, `strength` 40, `flavor` 60, `can_size` 40.
   These are silently truncated instead: `city` 80, `phone` 40, `notes`
   1000, `deal_conditions` 300, `hours` 120, `source_row_id`/`call_id` 120,
   `zip` 5. Control characters (incl. NUL) are stripped from all text. The
   error-report CSV neutralizes leading formula characters (OWASP CSV
   injection).
5. **Append-only history:** observations are never overwritten. "Latest
   price" is computed (see `ARCHITECTURE.md`). **Reversal** of a committed
   batch invalidates (not deletes) its observations/deals and retires
   stores whose only evidence was that batch; the audit log records it.
6. Absent optional values are stored as **unknown** — never defaulted to
   zero, `false`, or the regular-ZYN price.
7. **What a commit does** (one transaction, bulk writes): creates new
   stores (one per in-batch identity group) with their identities; enriches
   matched stores with supplied coordinates, phone, hours and external id
   (never blanks a field); appends observations (price-less ones for
   availability-only rows) and deals; opens duplicate candidates for new
   stores within ~100 m of existing ones; sends in-app price-watch alerts
   to members who saved a matched store whose price the batch changes, and
   coverage-arrived alerts to signed-in requesters of a ZIP that gets its
   first priced store; then, after the transaction, writes the audit event
   and fires the optional webhook (also on reversal — see `API.md`).

## Issue codes

Rejecting: `BAD_PRICE`, `BAD_DATE`, `MISSING_DATE`, `NO_STORE_IDENTITY`,
`BAD_COORDS`, `BAD_CURRENCY`, `UNKNOWN_PRODUCT`, `BAD_AVAILABILITY`,
`BAD_CONFIDENCE`, `BAD_DEAL_QTY`, `BAD_DEAL_PRICE`, `DEAL_CONFLICT`,
`BAD_DEAL_EXPIRY`, `FIELD_TOO_LONG`.
Flagging: `PRICE_OUT_OF_RANGE`, `AMBIGUOUS_STORE`, `NO_FACTS`.
Skipping: `DUPLICATE_IN_FILE`, `DUPLICATE_PRIOR_IMPORT`, `DUPLICATE_BATCH`.
Informational: `PRODUCT_DEFAULTED`, `NEW_STORE_SHARED`.

## Automated handoff

Besides the admin upload, the same contract is accepted programmatically by
`POST /api/imports` with a bearer API key (preview or commit in one call),
with `GET /api/imports/{id}` for batch status and optional HMAC-signed
webhooks — see [API.md](API.md). Disabled unless `IMPORT_API_KEY` is set.
The producing system writes one file per calling run; see
`ELEVENLABS_CALLING_RESEARCH.md` § integration roadmap.
