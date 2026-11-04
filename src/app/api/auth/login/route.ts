import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`login:${ip}`, 20, 900_000))) {
    return NextResponse.json({ error: "Too many attempts — try later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  const generic = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );
  if (!user || !user.passwordHash) return generic;
  if (!(await verifyPassword(password, user.passwordHash))) return generic;
  if (user.status !== "ACTIVE")
    return NextResponse.json({ error: "This account is suspended." }, { status: 403 });

  const { token, expiresAt } = await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
