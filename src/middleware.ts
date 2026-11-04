import { NextResponse, type NextRequest } from "next/server";

// 21+ age gate: every page (not API/static) requires the nf_age cookie.
// The gate itself is informational — this is a standard interstitial, not
// identity verification (see PRODUCT_REQUIREMENTS.md).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/age-gate") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  if (request.cookies.get("nf_age")?.value === "21plus") {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/age-gate";
  url.searchParams.set("next", pathname + (request.nextUrl.search || ""));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
