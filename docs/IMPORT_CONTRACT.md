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
- ≤ 10,000 data rows, ≤ 5 MB per upload.
- One row = one observation of one product line at one store. A store
  observed for both regular ZYN and ZYN Ultra produces **two rows**.
- Sample files: `sample-data/sample-import.csv` and `.xlsx` (fictional
  stores, deliberately including a flagged, a rejected, and a duplicate row).

## Columns

Canonical names below; headers are matched case/punctuation-insensitively
and through aliases (e.g. `PhoneNumber`, ` Store Name`, `ZYN Price`,
`Last Call` all map). Unrecognized columns are reported and can be mapped
manually in the preview UI. All optional unless marked required.

### Store identity (at least one required)

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
| `observed_at` | ISO 8601 datetime, **required** | When the price was observed (not exported). Include a UTC offset (`2026-11-01T14:05:00-06:00`); naive timestamps are interpreted by the server JS runtime and should be avoided. Future or pre-2000 dates → rejected. |
| `product_line` | slug | `zyn` or `zyn-ultra` (more may exist in DB). Unknown value → rejected. **Omitted** → attached to the regular line with confidence capped at 0.6 and an explanatory note; never attributed to Ultra. |
| `price_usd` | decimal, ≥0, ≤2dp | Regular single-can shelf price. `$`/commas tolerated. Outside $1.00–$25.00 → **flagged** for review, not published. |
| `currency` | string | Only `USD` (default). Anything else → rejected. |
| `tax_included` | `true/false/yes/no/1/0` | Blank = unknown (never assumed). |
| `availability` | `in_stock` \| `out_of_stock` \| `not_carried` \| `unknown` | Aliases like "does not carry" accepted. |
| `confidence` | 0–1 | Producer's confidence in the extraction. |
| `strength` / `flavor` / `can_size` | string | Optional variant detail. |

### Quantity deal (all-or-nothing group)

| Column | Type | Notes |
| --- | --- | --- |
| `deal_min_qty` | int ≥ 2 | Required if any deal field present. |
| `deal_price_per_can_usd` | decimal | Per-can price at qty. **Either** this |
| `deal_discount_per_can_usd` | decimal | **or** this — not both. |
| `deal_applies_above_min_qty` | bool | Blank = unknown → the UI will not extrapolate beyond `min_qty`. |
| `deal_conditions` | string | Loyalty/membership/etc., verbatim. |
| `deal_expires_at` | ISO 8601 | |

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
   store match or out-of-sanity price — needs manual action), `REJECTED`
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
   **Field bounds:** free-text fields have hard length limits (store name
   120, address 200, city 80, notes 1000, conditions 500, …); exceeding one
   rejects the row with `FIELD_TOO_LONG`. The error-report CSV neutralizes
   leading formula characters (OWASP CSV injection).
5. **Append-only history:** observations are never overwritten. "Latest
   price" is computed (see `ARCHITECTURE.md`). **Reversal** of a committed
   batch invalidates (not deletes) its observations/deals and retires
   stores whose only evidence was that batch; the audit log records it.
6. Absent optional values are stored as **unknown** — never defaulted to
   zero, `false`, or the regular-ZYN price.

## Future automated handoff

The admin upload is the MVP contract. The planned evolution (same schema):
a watched cloud-storage folder or `POST /api/imports` with an API key, with
the producing system writing one file per calling run and polling the batch
status endpoint for the outcome report. See `ELEVENLABS_CALLING_RESEARCH.md`
§ integration roadmap.
