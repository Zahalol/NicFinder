// Retire / restore a store. Retiring removes it from search and public pages
// (store page 404s like MERGED stores) while every observation, deal,
// contribution and comment stays in the database untouched — restoring
// brings it all back. Nothing is deleted.
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
    const action = b?.action as "retire" | "restore" | undefined;
    const reason = String(b?.reason ?? "").trim().slice(0, 300);

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

    if (action === "retire") {
      if (store.status !== "ACTIVE")
        return NextResponse.json({ error: `Store is ${store.status}, not ACTIVE.` }, { status: 409 });
      if (!reason)
        return NextResponse.json({ error: "A reason is required (e.g. “closed permanently”)." }, { status: 400 });
      await prisma.$transaction([
        prisma.store.update({ where: { id }, data: { status: "RETIRED" } }),
        prisma.moderationAction.create({
          data: { actorId: user.id, action: "RETIRE_STORE", targetType: "store", targetId: id, reason },
        }),
      ]);
      await audit("STORE_RETIRED", { userId: user.id, targetType: "store", targetId: id, detail: { reason } });
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      if (store.status !== "RETIRED")
        return NextResponse.json({ error: `Store is ${store.status}, not RETIRED.` }, { status: 409 });
      await prisma.$transaction([
        prisma.store.update({ where: { id }, data: { status: "ACTIVE" } }),
        prisma.moderationAction.create({
          data: { actorId: user.id, action: "RESTORE_STORE", targetType: "store", targetId: id, reason: reason || "Restored" },
        }),
      ]);
      await audit("STORE_RESTORED", { userId: user.id, targetType: "store", targetId: id });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  });
}
