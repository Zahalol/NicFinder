// Edit your own comment. Marked with editedAt so readers can tell.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!(await rateLimit(`comment-edit:${user.id}`, 20, 3600_000)))
      return NextResponse.json({ error: "Too many edits — try later." }, { status: 429 });
    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.status !== "VISIBLE")
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    if (comment.userId !== user.id)
      return NextResponse.json({ error: "You can only edit your own notes." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const text = String(body?.body ?? "").trim();
    if (text.length < 2 || text.length > 500)
      return NextResponse.json({ error: "Comment must be 2–500 characters." }, { status: 400 });

    await prisma.comment.update({
      where: { id },
      data: { body: text, editedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
