// Change your password. Requires the current password (or none for
// OAuth-only accounts setting one for the first time) and revokes every
// OTHER session so a stolen session can't outlive the change.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireUser,
  AuthError,
  verifyPassword,
  hashPassword,
  validatePassword,
  SESSION_COOKIE,
} from "@/lib/auth";
import { createHash } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const current = String(body?.currentPassword ?? "");
    const next = String(body?.newPassword ?? "");

    const pwErr = validatePassword(next);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    if (user.passwordHash) {
      if (!(await verifyPassword(current, user.passwordHash)))
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 403 }
        );
    }
    // OAuth-only accounts (no passwordHash) may set a first password.

    const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
    const currentTokenHash = createHash("sha256").update(token).digest("hex");

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(next) },
      }),
      // Keep this session, revoke all others.
      prisma.authSession.deleteMany({
        where: { userId: user.id, tokenHash: { not: currentTokenHash } },
      }),
    ]);
    return NextResponse.json({
      ok: true,
      message: "Password updated. Other signed-in devices were signed out.",
    });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
