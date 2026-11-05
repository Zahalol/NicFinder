import { SearchBox } from "@/components/SearchBox";
import { QuickSearches } from "@/components/QuickSearches";
import { prisma } from "@/lib/db";
import Link from "next/link";

// Pilot-area neighborhoods for first-visit quick chips (replaced by the
// visitor's own recent searches once they have any).
const POPULAR = [
  { q: "60614", label: "Lincoln Park 60614" },
  { q: "60657", label: "Lakeview 60657" },
  { q: "60622", label: "Wicker Park 60622" },
  { q: "60618", label: "North Center 60618" },
  { q: "60647", label: "Logan Square 60647" },
];

function timeAgo(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export default async function HomePage() {
  const [storeCount, pricedCount, recentObs] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.store.count({
      where: { status: "ACTIVE", observations: { some: { status: "ACTIVE" } } },
    }),
    // Recent price activity: newest ACTIVE observations on active stores.
    prisma.priceObservation.findMany({
      where: { status: "ACTIVE", store: { status: "ACTIVE" } },
      orderBy: { observedAt: "desc" },
      take: 5,
      include: {
        store: { select: { id: true, name: true, city: true, zip: true, isDemo: true } },
        productLine: { select: { name: true } },
      },
    }),
  ]);

  // Change vs the store's previous recorded price for the same line (any
  // status — superseded rows are exactly the prior history).
  const recent = await Promise.all(
    recentObs.map(async (o) => {
      const prev = await prisma.priceObservation.findFirst({
        where: {
          storeId: o.storeId,
          productLineId: o.productLineId,
          // only prices that were legitimately displayed at some point
          status: { in: ["ACTIVE", "SUPERSEDED"] },
          observedAt: { lt: o.observedAt },
        },
        orderBy: { observedAt: "desc" },
        select: { priceCents: true },
      });
      return { o, deltaCents: prev ? o.priceCents - prev.priceCents : null };
    })
  );

  return (
    <div className="py-14 sm:py-20">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Find the best nicotine pouch price near you
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400">
          Compare reported ZYN prices at gas stations and convenience stores.
          Free to browse — no account needed.
        </p>
        <div className="mt-8">
          <SearchBox autoFocus />
          <QuickSearches popular={POPULAR} />
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Our pilot area is Chicago —{" "}
          <Link className="underline" href="/search?q=60614">60614</Link> and nearby.{" "}
          {storeCount} stores tracked, {pricedCount} with reported prices.
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-14 max-w-xl mx-auto">
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300 text-center">
            Latest price reports
          </h2>
          <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
            {recent.map(({ o, deltaCents }) => (
              <li key={o.id}>
                <Link
                  href={`/stores/${o.store.id}`}
                  className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                      {o.store.name}
                    </span>{" "}
                    {o.store.isDemo && (
                      <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-medium px-1 py-0.5 uppercase align-middle">
                        demo
                      </span>
                    )}
                    <span className="block text-xs text-stone-400">
                      {o.productLine.name}
                      {o.store.zip ? ` · ${o.store.zip}` : ""} ·{" "}
                      {timeAgo(o.observedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {(o.priceCents / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                    {deltaCents !== null && deltaCents !== 0 && (
                      <span
                        className={`block text-xs ${deltaCents < 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
                      >
                        {deltaCents < 0 ? "▾" : "▴"}{" "}
                        {(Math.abs(deltaCents) / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}{" "}
                        vs prior
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center">
            <Link href="/price-drops" className="text-xs text-teal-700 dark:text-teal-400 hover:underline">
              See recent price drops →
            </Link>
          </p>
        </div>
      )}

      <div className="mt-14 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          {
            title: "Honest prices",
            body: "Every price shows where it came from and how old it is. No price? We say so — we never invent one.",
          },
          {
            title: "Community-verified",
            body: "Signed-in members confirm or correct prices. Trusted contributors keep listings fresh.",
          },
          {
            title: "Deals that math out",
            body: "Multi-can deals like “buy 5, save $1 each” are compared per-can, separately from single-can prices.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <h2 className="font-medium text-stone-900 dark:text-stone-100">{f.title}</h2>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
