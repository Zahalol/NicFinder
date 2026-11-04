import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { commitBatch } from "@/lib/import/engine";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async (user) => {
    const { id } = await params;
    const counts = await commitBatch(id, { userId: user.id });
    return NextResponse.json({ ok: true, counts });
  });
}
