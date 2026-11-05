import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { CANONICAL_FIELDS, type CanonicalField } from "@/lib/import/contract";
import { validateRows, countOutcomes } from "@/lib/import/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async () => {
    const { id } = await params;
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });
    if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    if (batch.status !== "PREVIEW")
      return NextResponse.json({ error: "Only preview batches can be remapped." }, { status: 409 });

    const body = await req.json().catch(() => null);
    const incoming = body?.mapping as Record<string, string | null> | undefined;
    if (!incoming) return NextResponse.json({ error: "mapping required" }, { status: 400 });

    const current = JSON.parse(batch.mappingJson) as Record<string, CanonicalField | null>;
    const next: Record<string, CanonicalField | null> = { ...current };
    for (const [header, field] of Object.entries(incoming)) {
      if (!(header in current))
        return NextResponse.json({ error: `Unknown header: ${header}` }, { status: 400 });
      if (field !== null && !(CANONICAL_FIELDS as readonly string[]).includes(field))
        return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
      next[header] = (field as CanonicalField) ?? null;
    }
    // Reject duplicate targets
    const targets = Object.values(next).filter(Boolean);
    if (new Set(targets).size !== targets.length)
      return NextResponse.json({ error: "Two columns map to the same field." }, { status: 400 });

    const rawRows = batch.rows.map((r) => JSON.parse(r.rawJson) as Record<string, unknown>);
    const validated = await validateRows(rawRows, next);
    const counts = countOutcomes(validated);

    const applied = await prisma.$transaction(async (tx) => {
      // Conditional claim FIRST: a remap racing a concurrent commit blocks
      // on the batch row lock (the commit claims PREVIEW→COMMITTED), then
      // matches 0 rows here and aborts instead of overwriting the committed
      // batch's row outcomes (which reversal depends on).
      const claimed = await tx.importBatch.updateMany({
        where: { id, status: "PREVIEW" },
        data: {
          mappingJson: JSON.stringify(next),
          totalRows: counts.total,
          acceptedRows: counts.accepted,
          updatedRows: counts.updated,
          skippedRows: counts.skipped,
          flaggedRows: counts.flagged,
          rejectedRows: counts.rejected,
        },
      });
      if (claimed.count === 0) return false;
      for (let i = 0; i < validated.length; i++) {
        await tx.importRow.update({
          where: { id: batch.rows[i].id },
          data: {
            rowHash: validated[i].rowHash,
            outcome: validated[i].outcome,
            issuesJson: JSON.stringify(validated[i].issues),
            matchedStoreId: validated[i].matchedStoreId,
          },
        });
      }
      return true;
    });
    if (!applied)
      return NextResponse.json(
        { error: "Batch is no longer in preview — it was committed or reversed." },
        { status: 409 }
      );

    return NextResponse.json({ ok: true, counts });
  });
}
