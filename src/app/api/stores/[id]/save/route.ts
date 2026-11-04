// Watchlist: save/unsave a store.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: storeId } = await params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.status !== "ACTIVE")
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    const count = await prisma.savedStore.count({ where: { userId: user.id } });
    if (count >= 100)
      return NextResponse.json({ error: "Watchlist limit reached (100)." }, { status: 400 });
    await prisma.savedStore.createMany({
      data: [{ userId: user.id, storeId }],
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true, saved: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: storeId } = await params;
    await prisma.savedStore.deleteMany({ where: { userId: user.id, storeId } });
    return NextResponse.json({ ok: true, saved: false });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
