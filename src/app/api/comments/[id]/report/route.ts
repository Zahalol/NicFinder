import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const settings = await getSettings();
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.status !== "VISIBLE")
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });

    const updated = await prisma.comment.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });
    if (updated.reportCount >= settings.autoHideReportCount) {
      await prisma.comment.update({ where: { id }, data: { status: "HIDDEN" } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
