// Change your display name.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const displayName = String(body?.displayName ?? "").trim().slice(0, 40);
    if (displayName.length < 2)
      return NextResponse.json(
        { error: "Display name must be at least 2 characters." },
        { status: 400 }
      );
    await prisma.user.update({ where: { id: user.id }, data: { displayName } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
