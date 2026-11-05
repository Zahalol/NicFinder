// Edit staff-maintained store details (currently: opening hours text).
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async (user) => {
    const { id } = await params;
    const b = await req.json().catch(() => null);
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

    const hours =
      b?.hours === null || String(b?.hours ?? "").trim() === ""
        ? null
        : String(b.hours).trim().slice(0, 120);

    await prisma.store.update({ where: { id }, data: { hours } });
    await audit("STORE_DETAILS_EDITED", {
      userId: user.id,
      targetType: "store",
      targetId: id,
      detail: { hours },
    });
    return NextResponse.json({ ok: true });
  });
}
