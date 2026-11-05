// Nonce-based Content-Security-Policy (production only — dev needs
// unsafe-eval for React Refresh). Every HTML page is dynamically rendered,
// so Next can inject the per-request nonce into its inline scripts.
//
// Allowances, each for a concrete reason:
//   style-src 'unsafe-inline'  — Leaflet and chart/bar components set inline
//                                style attributes; no <style> injection of
//                                user content exists (React escapes text).
//   img-src tile.openstreetmap.org — the map tiles. data:/blob: for Leaflet.
//   everything else locked to 'self' / 'none'.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://tile.openstreetmap.org`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the CSP from the request to nonce its own inline scripts.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // All pages; skip static assets and metadata files (no scripts there).
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.png|icon-192.png|icon-512.png|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
