# Automated import API

Programmatic handoff for price data (e.g. the future calling pipeline).
This doc covers only the programmatic import API; every other `/api` route
is internal to the app's own UI and not a supported interface.
Same contract, validation, idempotency and reversal machinery as admin
uploads — see `IMPORT_CONTRACT.md` for the file format.

## Enabling

Disabled by default. Set in the deployment's secrets:

- `IMPORT_API_KEY` — bearer token, 16+ chars (`openssl rand -hex 24`).
  Unset **or shorter than 16 characters** → the endpoints return 404.
- `IMPORT_WEBHOOK_URL` — optional HTTPS receiver for batch-status pushes.
  Unset or not `https://` → ignored; the app makes no outbound calls.

## Endpoints

### `POST /api/imports`

Multipart form upload, field `file` (.csv or .xlsx, ≤5 MB, ≤10,000 rows;
oversized → 413, too many rows → 400). The request itself may be up to
8 MB (middleware allowance for multipart overhead).

- `Authorization: Bearer <IMPORT_API_KEY>` required (401 otherwise).
- Headers are auto-mapped (same aliases as the admin UI); unmapped columns
  are reported in `unmappedHeaders`, not remapped.
- Default: validates and stores a **PREVIEW** batch (nothing applied).
- `?commit=true`: validates **and commits** in one call. Idempotent: an
  identical file that was already committed skips every row; identical rows
  from earlier batches skip individually.

Response:
```json
{
  "batchId": "…",
  "status": "PREVIEW" | "COMMITTED",
  "counts": { "total": 10, "accepted": 6, "updated": 0, "skipped": 1, "flagged": 1, "rejected": 1 },
  "unmappedHeaders": ["some_unknown_column"]
}
```

Flagged/rejected rows are never applied; inspect them in the admin UI
(`/admin/imports/<batchId>`) or via the errors CSV. A PREVIEW batch is
committed (optionally after remapping columns) from the admin UI; there is
no discard — an uncommitted preview simply stays PREVIEW and applies
nothing. A committed batch can be reversed there.

### `GET /api/imports/{batchId}`

Same auth. 404 if the batch doesn't exist. Note the field names differ from
the POST `counts`:

```json
{
  "batch": {
    "id": "…", "filename": "…",
    "status": "PREVIEW" | "COMMITTED" | "REVERSED",
    "createdAt": "ISO-8601", "committedAt": "ISO-8601" | null, "reversedAt": "ISO-8601" | null,
    "totalRows": 10, "acceptedRows": 6, "updatedRows": 0,
    "skippedRows": 1, "flaggedRows": 1, "rejectedRows": 1
  }
}
```

## Webhook pushes (optional)

When `IMPORT_WEBHOOK_URL` is set (https only), the app POSTs JSON on every
commit and reversal — including ones made from the admin UI, since the
webhook is sent by the import engine, not the API route:

```json
{ "event": "import.committed", "batchId": "…", "filename": "…", "counts": { … }, "at": "ISO-8601" }
{ "event": "import.reversed",  "batchId": "…", "reason": "…", "at": "ISO-8601" }
```

When `IMPORT_API_KEY` is set, headers include `X-NicFinder-Signature:
sha256=<hex>` — HMAC-SHA256 of the raw body keyed with `IMPORT_API_KEY` —
so the receiver can verify origin. (Without a key, deliveries are
unsigned; receivers should reject unsigned payloads.)
Deliveries are best-effort (5s timeout, failures logged and ignored); poll
`GET /api/imports/{id}` as the source of truth.

## Example

```bash
curl -sS -X POST "https://<host>/api/imports?commit=true" \
  -H "Authorization: Bearer $IMPORT_API_KEY" \
  -F "file=@prices-2026-11-05.csv"
```
