import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-only packages out of the client bundle.
  serverExternalPackages: ["exceljs", "@prisma/client"],
};

export default nextConfig;
