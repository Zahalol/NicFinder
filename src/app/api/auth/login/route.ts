import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";
import { rateLimit, memoryRateCheck, memoryRateRecord } from "@/lib/rate-limit";

// A valid-format scrypt hash of a throwaway password, used only to equalize
// response timing when the account does not exist (never matches real input).
const DUMMY_HASH =
  "scrypt:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:3a7e3146ab2f858e133243bcd464332940994b9d8bc1c826f9ab7d16ea595291d18f8b02b61bdeb318308b983ebc0150146344cf621547a8111709df054946d6";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await rateLimit(`login:ip:${ip}`, 20, 900_000))) {
    return NextResponse.json({ error: "Too many attempts — try later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  // Per-account limiter: the IP key alone is defeated by rotating
  // X-Forwarded-For, so also cap attempts against a single email. Only
  // FAILED attempts count (recorded below) — otherwise an attacker could
  // lock the real owner out by burning the quota with garbage passwords
  // while the owner's own successful logins also counted against it.
  if (email && !memoryRateCheck(`login:email:${email}`, 10, 900_000)) {
    return NextResponse.json({ error: "Too many attempts — try later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const generic = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );
  if (!user || !user.passwordHash) {
    // Equalize timing with the real-password path: verify against a fixed
    // dummy hash so "account exists" is not inferable from response time.
    await verifyPassword(password, DUMMY_HASH);
    if (email) memoryRateRecord(`login:email:${email}`);
    return generic;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    memoryRateRecord(`login:email:${email}`);
    return generic;
  }
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
