// Downloadable CSV error report for an import batch.
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { csvCell as csvEscape } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async () => {
    const { id } = await params;
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: {
        rows: {
          where: { outcome: { in: ["REJECTED", "FLAGGED", "SKIPPED_DUPLICATE"] } },
          orderBy: { rowNumber: "asc" },
        },
      },
    });
    if (!batch) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const lines = ["row_number,outcome,issues,raw_json"];
    for (const r of batch.rows) {
      const issues = (JSON.parse(r.issuesJson) as { code: string; message: string }[])
        .map((i) => `${i.code}: ${i.message}`)
        .join(" | ");
      lines.push(
        [r.rowNumber, r.outcome, csvEscape(issues), csvEscape(r.rawJson)].join(",")
      );
    }
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-${id.slice(0, 8)}-errors.csv"`,
      },
    });
  });
}
