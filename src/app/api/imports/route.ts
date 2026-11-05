// Automated import handoff (roadmap #11): lets a trusted pipeline (e.g. the
// future calling system) submit CSV/XLSX files programmatically, using the
// SAME contract, validation, idempotency and reversal machinery as admin
// uploads — nothing is special-cased.
//
// Auth: `Authorization: Bearer <IMPORT_API_KEY>`. When the env var is unset
// the endpoint is disabled entirely (404), so nothing is exposed by default.
// Constant-time comparison; key never logged.
//
// POST /api/imports            multipart form: file=<csv|xlsx>
//   ?commit=true               validate AND commit in one call (idempotent:
//                              a previously committed identical file skips)
// → { batchId, status, counts, unmappedHeaders }
import { NextResponse, type NextRequest } from "next/server";
import { importApiKeyOk } from "@/lib/import-api-auth";
import { parseImportFile } from "@/lib/import/parse";
import { autoMapHeaders } from "@/lib/import/contract";
import {
  validateRows,
  createPreviewBatch,
  commitBatch,
  computeContentHash,
  countOutcomes,
} from "@/lib/import/engine";
import { audit } from "@/lib/audit";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = importApiKeyOk(req);
  if (auth === null) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!auth) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Attach a .csv or .xlsx file as 'file'." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large (5 MB max)." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed, fileType: "csv" | "xlsx";
  try {
    ({ parsed, fileType } = await parseImportFile(file.name, buffer));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file." },
      { status: 400 }
    );
  }
  if (!parsed.headers.length || !parsed.rows.length)
    return NextResponse.json({ error: "File has no data rows." }, { status: 400 });
  if (parsed.rows.length > 10_000)
    return NextResponse.json({ error: "Too many rows (10,000 max)." }, { status: 400 });

  const { mapping, unmapped } = autoMapHeaders(parsed.headers);
  // Identity tags use the shared default source so a batch uploaded via API
  // and one uploaded via the admin UI match the same stores (the channel is
  // recorded in the audit event, not in matching identities).
  const validated = await validateRows(parsed.rows, mapping);
  const batchId = await createPreviewBatch({
    filename: file.name,
    contentHash: computeContentHash(buffer),
    fileType,
    mapping,
    rows: validated,
  });
  await audit("IMPORT_API_UPLOAD", {
    targetType: "importBatch",
    targetId: batchId,
    detail: { filename: file.name, rows: parsed.rows.length },
  });

  const wantCommit = req.nextUrl.searchParams.get("commit") === "true";
  if (!wantCommit) {
    return NextResponse.json({
      batchId,
      status: "PREVIEW",
      counts: countOutcomes(validated),
      unmappedHeaders: unmapped,
    });
  }
  const counts = await commitBatch(batchId);
  return NextResponse.json({
    batchId,
    status: "COMMITTED",
    counts,
    unmappedHeaders: unmapped,
  });
}
