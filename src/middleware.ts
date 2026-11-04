// API request-size guard. App Router route handlers put no limit on request
// bodies — `await req.json()` buffers whatever arrives, so an oversized POST
// is an easy memory-pressure vector. JSON endpoints here need a few KB; only
// the admin import upload legitimately sends more (5 MB file cap + form
// overhead). Content-Length can be absent on chunked requests, so this is a
// first-line guard, not the only one (per-field caps exist downstream).
import { NextResponse, type NextRequest } from "next/server";

const JSON_MAX_BYTES = 64 * 1024;
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export function middleware(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return NextResponse.next();
  const length = Number(req.headers.get("content-length") ?? 0);
  const isUpload = req.nextUrl.pathname === "/api/admin/imports";
  const max = isUpload ? UPLOAD_MAX_BYTES : JSON_MAX_BYTES;
  if (Number.isFinite(length) && length > max) {
    return NextResponse.json({ error: "Request body too large." }, { status: 413 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
