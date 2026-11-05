import { NextResponse, type NextRequest } from "next/server";
import { withStaff, ApiError } from "@/lib/admin-api";
import { reverseBatch, BatchStateError } from "@/lib/import/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async (user) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? "").trim();
    if (reason.length < 3)
      return NextResponse.json({ error: "A reason is required to reverse an import." }, { status: 400 });
    try {
      await reverseBatch(id, reason, user.id);
    } catch (e) {
      if (e instanceof BatchStateError) throw new ApiError(409, e.message);
      throw e;
    }
    return NextResponse.json({ ok: true });
  });
}
