import { NextResponse, type NextRequest } from "next/server";
import { withStaff, ApiError } from "@/lib/admin-api";
import { commitBatch, BatchStateError } from "@/lib/import/engine";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async (user) => {
    const { id } = await params;
    try {
      const counts = await commitBatch(id, { userId: user.id });
      return NextResponse.json({ ok: true, counts });
    } catch (e) {
      if (e instanceof BatchStateError) throw new ApiError(409, e.message);
      throw e;
    }
  });
}
