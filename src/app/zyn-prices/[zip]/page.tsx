// SEO landing page: "ZYN prices in <city>, <state> <zip>".
// Organic search is the main acquisition channel (nicotine ads are banned
// on major platforms) — these pages are cached and regenerated hourly.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { geocodeZip, zipInfo } from "@/lib/geocode";
import { searchStores } from "@/lib/search";
import { formatCents } from "@/lib/money";
import { jsonLdString } from "@/lib/json-ld";

// Server-rendered per request (the root layout reads the age cookie, which
// opts the tree into dynamic rendering). Crawlers receive the full HTML —
// the age gate is a client overlay, not a redirect — so these pages index.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zip: string }>;
}): Promise<Metadata> {
  const { zip } = await params;
  const info = zipInfo(zip);
  if (!info) return { title: "ZYN prices — NicFinder" };
  return {
    title: `ZYN prices in ${info.city}, ${info.state} ${zip} — NicFinder`,
    alternates: { canonical: `/zyn-prices/${zip}` },
    description: `Compare reported ZYN nicotine pouch prices at gas stations and convenience stores near ${info.city}, ${info.state} ${zip}. Community-verified, updated continuously. Adults 21+.`,
  };
}

export default async function ZipLandingPage({
  params,
}: {
  params: Promise<{ zip: string }>;
}) {
  const { zip } = await params;
  if (!/^\d{5}$/.test(zip)) notFound();
  const centroid = geocodeZip(zip);
  const info = zipInfo(zip);
  if (!centroid || !info) notFound();

  const [{ results }, ultraSearch] = await Promise.all([
    searchStores({
      lat: centroid.latitude,
      lng: centroid.longitude,
      radiusMiles: 5,
      productSlug: "zyn",
      qty: 1,
      sort: "price",
    }),
    searchStores({
      lat: centroid.latitude,
      lng: centroid.longitude,
      radiusMiles: 5,
      productSlug: "zyn-ultra",
      qty: 1,
      sort: "price",
    }),
  ]);
  const priced = results.filter((r) => r.latest);
  // Ultra prices by store id (never inherited from regular ZYN).
  const ultraByStore = new Map(
    ultraSearch.results.filter((r) => r.latest).map((r) => [r.id, r.latest!])
  );
  const anyUltra = ultraByStore.size > 0;

  // Summary stats over reported prices (results are already price-sorted).
  const prices = priced.map((r) => r.latest!.priceCents);
  const stats =
    prices.length > 0
      ? {
          low: prices[0],
          high: prices[prices.length - 1],
          median: prices[Math.floor((prices.length - 1) / 2)],
          freshestDays: Math.min(...priced.map((r) => r.latest!.ageDays)),
        }
      : null;
  const bestDeal = priced
    .filter((r) => r.deal)
    .sort((a, b) => a.latest!.priceCents - b.latest!.priceCents)[0];

  // Other covered ZIPs for internal linking, labeled with their city.
  const otherZips = (
    await prisma.store.findMany({
      where: { status: "ACTIVE", zip: { not: null, notIn: [zip] }, observations: { some: { status: "ACTIVE" } } },
      select: { zip: true },
      distinct: ["zip"],
      take: 12,
    })
  )
    .map((s) => s.zip!)
    .sort()
    .map((z) => ({ zip: z, city: zipInfo(z)?.city ?? null }));

  // Structured data: honest, computed from the same numbers the page shows.
  const jsonLd =
    stats !== null
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `How much does a can of ZYN cost in ${info.city}, ${info.state} ${zip}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Reported prices at ${priced.length} store${priced.length === 1 ? "" : "s"} near ${zip} currently range from ${formatCents(stats.low)} to ${formatCents(stats.high)} per can (median ${formatCents(stats.median)}). Prices are community- and staff-reported, usually exclude tax, and change often — check the live listing for freshness.`,
              },
            },
          ],
        }
      : null;

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <nav className="text-xs text-stone-400">
        <Link href="/" className="hover:text-stone-700">NicFinder</Link> /{" "}
        <Link href="/zyn-prices" className="hover:text-stone-700">ZYN prices</Link> / {zip}
      </nav>
      <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
        ZYN prices in {info.city}, {info.state} {zip}
      </h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm">
        Latest reported prices for a can of ZYN nicotine pouches at stores
        within 5 miles of the {zip} ZIP code area.{" "}
        {priced.length > 0
          ? `${priced.length} of ${results.length} tracked stores currently have a reported price.`
          : `${results.length} stores tracked; no current prices reported yet.`}{" "}
        Prices are community- and import-verified and may exclude tax.
      </p>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
        />
      )}

      {stats && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ["Cheapest", formatCents(stats.low)],
            ["Median", formatCents(stats.median)],
            ["Highest", formatCents(stats.high)],
            [
              "Last update",
              stats.freshestDays === 0 ? "today" : `${stats.freshestDays}d ago`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                {label}
              </div>
              <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">{value}</div>
            </div>
          ))}
        </div>
      )}

      {priced.length > 0 && (
        <p className="mt-3 inline-block rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 px-3 py-2 text-sm text-teal-900 dark:text-teal-200">
          Cheapest reported: <strong>{formatCents(priced[0].latest!.priceCents)}</strong> at{" "}
          <Link href={`/stores/${priced[0].id}`} className="underline">{priced[0].name}</Link>
          {bestDeal?.deal && (
            <>
              {" · "}best multi-can deal:{" "}
              <Link href={`/stores/${bestDeal.id}`} className="underline">
                {bestDeal.deal.minQty}+ cans{" "}
                {bestDeal.deal.pricePerCanCents !== null
                  ? `at ${formatCents(bestDeal.deal.pricePerCanCents)} each`
                  : `save ${formatCents(bestDeal.deal.discountPerCanCents)} per can`}{" "}
                at {bestDeal.name}
              </Link>
            </>
          )}
        </p>
      )}

      {results.length === 0 ? (
        <div className="mt-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            We don’t track stores in this area yet.{" "}
            <Link href={`/search?q=${zip}`} className="text-teal-700 dark:text-teal-400 underline">
              Search this ZIP
            </Link>{" "}
            to request coverage — we expand to the most-requested areas first.
          </p>
        </div>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200 dark:border-stone-800">
              <th className="py-2 pr-2">Store</th>
              <th className="py-2 pr-2">Address</th>
              <th className="py-2 pr-2">ZYN price</th>
              {anyUltra && <th className="py-2 pr-2">Ultra</th>}
              <th className="py-2">Reported</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 dark:border-stone-800">
                <td className="py-2 pr-2">
                  <Link href={`/stores/${r.id}`} className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
                    {r.name}
                  </Link>
                  {r.isDemo && (
                    <span className="ml-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-medium px-1 py-0.5 uppercase">demo</span>
                  )}
                </td>
                <td className="py-2 pr-2 text-stone-500">{r.address}</td>
                <td className="py-2 pr-2 font-semibold text-stone-900 dark:text-stone-100">
                  {r.latest ? formatCents(r.latest.priceCents) : <span className="font-normal text-stone-400">not reported</span>}
                </td>
                {anyUltra && (
                  <td className="py-2 pr-2 text-stone-700 dark:text-stone-300">
                    {ultraByStore.has(r.id) ? (
                      formatCents(ultraByStore.get(r.id)!.priceCents)
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                )}
                <td className="py-2 text-stone-500">
                  {r.latest ? `${r.latest.ageDays}d ago` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-6">
        <Link
          href={`/search?q=${zip}`}
          className="inline-block rounded-xl bg-teal-600 text-white px-5 py-2.5 font-medium hover:bg-teal-700"
        >
          Compare on the live map →
        </Link>
      </p>

      {otherZips.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300">ZYN prices in nearby areas</h2>
          <p className="mt-2 flex flex-wrap gap-2">
            {otherZips.map((z) => (
              <Link
                key={z.zip}
                href={`/zyn-prices/${z.zip}`}
                className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1 text-sm text-stone-600 dark:text-stone-400 hover:border-teal-300"
              >
                {z.city ? `${z.city} ${z.zip}` : z.zip}
              </Link>
            ))}
          </p>
        </div>
      )}

      <p className="mt-10 text-xs text-stone-400">
        NicFinder is an informational price-comparison service for adults 21+.
        We do not sell nicotine products. Prices vary by store and over time,
        usually exclude tax, and depend on stock — confirm with the store.
      </p>
    </div>
  );
}
