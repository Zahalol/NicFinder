// Sign out everywhere, including this device.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  try {
    const user = await requireUser();
    const { count } = await prisma.authSession.deleteMany({
      where: { userId: user.id },
    });
    const res = NextResponse.json({ ok: true, revoked: count });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
