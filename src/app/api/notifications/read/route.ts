import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

export async function POST() {
  try {
    const user = await requireUser();
    const count = await markAllRead(user.id);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
