// Batch status for the automated import API (same bearer key as POST).
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { importApiKeyOk } from "@/lib/import-api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = importApiKeyOk(req);
  if (auth === null) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!auth) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  const { id } = await params;
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
      committedAt: true,
      reversedAt: true,
      totalRows: true,
      acceptedRows: true,
      updatedRows: true,
      skippedRows: true,
      flaggedRows: true,
      rejectedRows: true,
    },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  return NextResponse.json({ batch });
}
