import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const canDelete =
      comment.userId === user.id || user.role === "ADMIN" || user.role === "MODERATOR";
    if (!canDelete) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    await prisma.comment.update({ where: { id }, data: { status: "DELETED" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
