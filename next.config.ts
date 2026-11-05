import type { NextConfig } from "next";

// Static security headers. The Content-Security-Policy is NOT set here: it
// needs a per-request nonce, so src/middleware.ts sets it (production only).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation is used by the "use my location" search button; nothing else.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Keep server-only packages out of the client bundle.
  serverExternalPackages: ["exceljs", "@prisma/client"],
  // /about was a second "How NicFinder works" page built in parallel with
  // /how-it-works; keep one canonical explainer and redirect the other.
  async redirects() {
    return [{ source: "/about", destination: "/how-it-works", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
