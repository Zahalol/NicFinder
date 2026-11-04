import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [zips, stores] = await Promise.all([
    prisma.store.findMany({
      where: { status: "ACTIVE", zip: { not: null } },
      select: { zip: true },
      distinct: ["zip"],
    }),
    // Real stores only — fictional demo stores are noindexed and don't
    // belong in the sitemap.
    prisma.store.findMany({
      where: { status: "ACTIVE", isDemo: false },
      select: { id: true, updatedAt: true },
      take: 5000,
    }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...zips.map((z) => ({
      url: `${base}/zyn-prices/${z.zip}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...stores.map((s) => ({
      url: `${base}/stores/${s.id}`,
      lastModified: s.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
