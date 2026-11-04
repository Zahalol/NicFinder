import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { countRecentComments } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: storeId } = await params;
    const settings = await getSettings();

    const recent = await countRecentComments(user.id);
    if (recent >= settings.commentRateLimitPerHour)
      return NextResponse.json({ error: "Comment rate limit reached — try later." }, { status: 429 });

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.status !== "ACTIVE")
      return NextResponse.json({ error: "Store not found." }, { status: 404 });

    const body = await req.json().catch(() => null);
    const text = String(body?.body ?? "").trim();
    if (text.length < 2 || text.length > 500)
      return NextResponse.json({ error: "Comment must be 2–500 characters." }, { status: 400 });

    const comment = await prisma.comment.create({
      data: { storeId, userId: user.id, body: text },
    });
    return NextResponse.json({ ok: true, id: comment.id });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
