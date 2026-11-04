// Google OAuth step 1: redirect to Google's consent screen.
// Only active when GOOGLE_CLIENT_ID/SECRET are configured (.env).
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { googleOAuthConfigured } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google sign-in is not configured. See .env.example." },
      { status: 501 }
    );
  }
  const state = randomBytes(16).toString("hex");
  const appUrl = process.env.APP_URL ?? req.nextUrl.origin;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${appUrl}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("nf_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
