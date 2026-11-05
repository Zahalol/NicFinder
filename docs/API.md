# Automated import API

Programmatic handoff for price data (e.g. the future calling pipeline).
Same contract, validation, idempotency and reversal machinery as admin
uploads — see `IMPORT_CONTRACT.md` for the file format.

## Enabling

Disabled by default. Set in the deployment's secrets:

- `IMPORT_API_KEY` — bearer token, 16+ chars (`openssl rand -hex 24`).
  Unset → the endpoints return 404.
- `IMPORT_WEBHOOK_URL` — optional HTTPS receiver for batch-status pushes.
  Unset → the app makes no outbound calls.

## Endpoints

### `POST /api/imports`

Multipart form upload, field `file` (.csv or .xlsx, ≤5 MB, ≤10,000 rows).

- `Authorization: Bearer <IMPORT_API_KEY>` required (401 otherwise).
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
(`/admin/imports/<batchId>`) or via the errors CSV. A PREVIEW batch can be
committed or discarded from the admin UI.

### `GET /api/imports/{batchId}`

Same auth. Returns batch status and row counts.

## Webhook pushes (optional)

When `IMPORT_WEBHOOK_URL` is set, the app POSTs JSON on commit/reversal:

```json
{ "event": "import.committed", "batchId": "…", "filename": "…", "counts": { … }, "at": "ISO-8601" }
{ "event": "import.reversed",  "batchId": "…", "reason": "…", "at": "ISO-8601" }
```

Headers include `X-NicFinder-Signature: sha256=<hex>` — HMAC-SHA256 of the
raw body keyed with `IMPORT_API_KEY` — so the receiver can verify origin.
Deliveries are best-effort (5s timeout, failures logged and ignored); poll
`GET /api/imports/{id}` as the source of truth.

## Example

```bash
curl -sS -X POST "https://<host>/api/imports?commit=true" \
  -H "Authorization: Bearer $IMPORT_API_KEY" \
  -F "file=@prices-2026-11-05.csv"
```
