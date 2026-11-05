// Two jobs, split by path:
//
// 1. API request-size guard (/api/*). App Router route handlers put no limit
//    on request bodies — `await req.json()` buffers whatever arrives, so an
//    oversized POST is an easy memory-pressure vector. JSON endpoints here
//    need a few KB; only the admin import upload legitimately sends more
//    (5 MB file cap + form overhead). Content-Length can be absent on chunked
//    requests, so this is a first-line guard, not the only one (per-field
//    caps exist downstream).
//
// 2. Nonce-based Content-Security-Policy for pages (production only — dev
//    needs unsafe-eval for React Refresh). Every HTML page is dynamically
//    rendered, so Next can inject the per-request nonce into its inline
//    scripts. Allowances, each for a concrete reason:
//      style-src 'unsafe-inline'  — Leaflet and chart/bar components set
//                                   inline style attributes; no <style>
//                                   injection of user content exists.
//      img-src tile.openstreetmap.org — the map tiles. data:/blob: for Leaflet.
//      everything else locked to 'self' / 'none'.
import { NextResponse, type NextRequest } from "next/server";

const JSON_MAX_BYTES = 64 * 1024;
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

function apiSizeGuard(req: NextRequest): NextResponse {
  if (req.method === "GET" || req.method === "HEAD") return NextResponse.next();
  const length = Number(req.headers.get("content-length") ?? 0);
  const isUpload = req.nextUrl.pathname === "/api/admin/imports";
  const max = isUpload ? UPLOAD_MAX_BYTES : JSON_MAX_BYTES;
  if (Number.isFinite(length) && length > max) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }
  return NextResponse.next();
}

function pageCsp(request: NextRequest): NextResponse {
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

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) return apiSizeGuard(request);
  return pageCsp(request);
}

export const config = {
  matcher: [
    // All API routes (size guard), including prefetch-free POSTs.
    "/api/:path*",
    // All pages; skip static assets and metadata files (no scripts there).
    {
      source:
        "/((?!api/|_next/static|_next/image|favicon.ico|icon.png|icon-192.png|icon-512.png|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
