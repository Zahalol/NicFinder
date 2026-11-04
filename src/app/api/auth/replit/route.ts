// Replit Auth: when this app is deployed on Replit with Auth enabled,
// Replit's proxy authenticates the visitor (Google/GitHub/Apple/email SSO)
// and injects identity headers on every request. We trust those headers
// ONLY when REPLIT_AUTH_ENABLED=true — set that secret exclusively in the
// Replit deployment, never in other environments, because anywhere else
// the headers could be forged by the client.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  replitAuthEnabled,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!replitAuthEnabled()) {
    return NextResponse.redirect(new URL("/login?error=replit-not-configured", req.url));
  }

  const replitId = req.headers.get("x-replit-user-id");
  const username = req.headers.get("x-replit-user-name");
  if (!replitId || !username) {
    // Not signed in at the Replit layer yet; Replit shows its own sign-in UI
    // on protected apps. Send the visitor home with a hint.
    return NextResponse.redirect(new URL("/login?error=replit-not-signed-in", req.url));
  }

  let user = await prisma.user.findUnique({ where: { replitId } });
  if (!user) {
    // Replit Auth does not expose a verified email — store a placeholder
    // identity; the user can link an email later. Handle the (unlikely)
    // placeholder collision by suffixing.
    const placeholderEmail = `replit-${replitId}@users.noreply.replit.local`;
    user = await prisma.user.create({
      data: {
        replitId,
        email: placeholderEmail,
        displayName: username.slice(0, 40),
        ageConfirmedAt: new Date(),
      },
    });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/login?error=suspended", req.url));
  }

  const { token, expiresAt } = await createSession(user.id, {
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
