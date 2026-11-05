import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const zips = await prisma.store.findMany({
    where: { status: "ACTIVE", zip: { not: null } },
    select: { zip: true },
    distinct: ["zip"],
  });
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
  ];
}
