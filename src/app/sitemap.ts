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
    // Store pages (bounded: well under the 50k sitemap limit at pilot and
    // regional scale; split into sitemap indexes if that ever changes).
    prisma.store.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      take: 10_000,
    }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/price-drops`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/zyn-prices`, changeFrequency: "daily", priority: 0.7 },
    ...zips.map((z) => ({
      url: `${base}/zyn-prices/${z.zip}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...stores.map((s) => ({
      url: `${base}/stores/${s.id}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
