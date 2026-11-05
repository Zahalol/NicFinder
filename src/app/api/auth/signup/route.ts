import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`signup:${ip}`, 10, 3600_000))) {
    return NextResponse.json({ error: "Too many attempts — try later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const displayName = String(body?.displayName ?? "").trim().slice(0, 40);

  const emailErr = validateEmail(email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const pwErr = validatePassword(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
  if (!displayName || displayName.length < 2)
    return NextResponse.json({ error: "Display name must be at least 2 characters." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      displayName,
      ageConfirmedAt: new Date(),
    },
  });

  const { token, expiresAt } = await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
