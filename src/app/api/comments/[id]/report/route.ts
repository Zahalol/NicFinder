import { NextResponse, type NextRequest } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { reportComment } from "@/lib/comments";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const settings = await getSettings();
    const result = await reportComment(id, user.id, settings);
    if (!result.ok)
      return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, already: result.already });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
