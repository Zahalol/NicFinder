import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { parseImportFile } from "@/lib/import/parse";
import { autoMapHeaders } from "@/lib/import/contract";
import {
  validateRows,
  createPreviewBatch,
  computeContentHash,
} from "@/lib/import/engine";
import { prisma } from "@/lib/db";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Attach a .csv or .xlsx file." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "File too large (5 MB max)." }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = computeContentHash(buffer);

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
      return NextResponse.json(
        { error: "File has no data rows (first sheet / header row expected)." },
        { status: 400 }
      );
    if (parsed.rows.length > 10_000)
      return NextResponse.json(
        { error: "Too many rows (10,000 max per import)." },
        { status: 400 }
      );

    const priorCommitted = await prisma.importBatch.findFirst({
      where: { contentHash, status: "COMMITTED" },
      select: { id: true, filename: true, committedAt: true },
    });

    const { mapping, unmapped } = autoMapHeaders(parsed.headers);
    const validated = await validateRows(parsed.rows, mapping);
    const batchId = await createPreviewBatch({
      filename: file.name,
      contentHash,
      fileType,
      mapping,
      rows: validated,
      uploadedById: user.id,
    });

    return NextResponse.json({
      ok: true,
      batchId,
      unmapped,
      alreadyCommitted: priorCommitted
        ? { filename: priorCommitted.filename, committedAt: priorCommitted.committedAt }
        : null,
    });
  });
}
