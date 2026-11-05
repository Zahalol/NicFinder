// Google OAuth step 2: exchange code, upsert user, start session.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  googleOAuthConfigured,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", req.url));
  }
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("nf_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=oauth-state", req.url));
  }

  const appUrl = process.env.APP_URL ?? req.nextUrl.origin;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const tokens = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!infoRes.ok) throw new Error("userinfo failed");
    const info = (await infoRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!info.email) throw new Error("no email from Google");
    // ACCOUNT-TAKEOVER GUARD: only a VERIFIED Google email may link to (or
    // create) an account keyed by that address. Google allows unverified
    // emails on some accounts — without this check, registering a Google
    // account with someone else's email would take over their NicFinder
    // account on first OAuth sign-in.
    if (info.email_verified !== true) throw new Error("google email not verified");

    const email = info.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleId: info.sub } });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Account-linking safety: local emails are NOT verified (no email
        // verification flow), so an attacker could pre-register a victim's
        // address with a password and wait for the victim to "sign in with
        // Google". Never auto-link into a password-protected account, and
        // never trust an unverified Google email for linking.
        if (byEmail.passwordHash || info.email_verified !== true) {
          return NextResponse.redirect(
            new URL("/login?error=email-exists-use-password", req.url)
          );
        }
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: info.sub },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId: info.sub,
            displayName: (info.name ?? email.split("@")[0]).slice(0, 40),
            ageConfirmedAt: new Date(),
          },
        });
      }
    }
    if (user.status !== "ACTIVE") {
      return NextResponse.redirect(new URL("/login?error=suspended", req.url));
    }

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.redirect(new URL("/", appUrl));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    res.cookies.set("nf_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google-failed", req.url));
  }
}
