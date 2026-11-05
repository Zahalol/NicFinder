// Recent price drops across covered stores: every entry is a real pair of
// recorded observations (new lower report vs the store's previous one).
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Recent ZYN price drops",
  description:
    "Stores where the reported ZYN nicotine pouch price went down recently, with the old and new price. Community-verified. Adults 21+.",
  alternates: { canonical: "/price-drops" },
};

const WINDOW_DAYS = 14;

function timeAgo(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default async function PriceDropsPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
  const recent = await prisma.priceObservation.findMany({
    where: {
      status: "ACTIVE",
      // availability-only rows ("not carried") have no price to compare
      priceCents: { not: null },
      observedAt: { gte: since },
      store: { status: "ACTIVE" },
    },
    orderBy: { observedAt: "desc" },
    take: 100,
    include: {
      store: { select: { id: true, name: true, address: true, city: true, zip: true, isDemo: true } },
      productLine: { select: { name: true } },
    },
  });

  // Baselines are restricted to observations that were legitimately shown
  // at some point (ACTIVE/SUPERSEDED) — never REVERSED import rows, which
  // would fabricate a "drop" against a price that never validly existed.
  const prevs = await Promise.all(
    recent.map((o) =>
      prisma.priceObservation.findFirst({
        where: {
          storeId: o.storeId,
          productLineId: o.productLineId,
          status: { in: ["ACTIVE", "SUPERSEDED"] },
          priceCents: { not: null },
          observedAt: { lt: o.observedAt },
        },
        orderBy: { observedAt: "desc" },
        select: { priceCents: true },
      })
    )
  );
  const drops: Array<{
    o: (typeof recent)[number];
    prevCents: number;
    deltaCents: number;
  }> = [];
  recent.forEach((o, i) => {
    const prev = prevs[i];
    if (prev?.priceCents == null || o.priceCents === null) return;
    if (o.priceCents < prev.priceCents) {
      drops.push({ o, prevCents: prev.priceCents, deltaCents: o.priceCents - prev.priceCents });
    }
  });
  drops.sort((a, b) => a.deltaCents - b.deltaCents);

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        Recent price drops
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Stores where the reported price went down in the last {WINDOW_DAYS} days —
        each entry compares the newest report against the store&apos;s previous
        recorded one. Prices may exclude tax and can change again.
      </p>

      {drops.length === 0 ? (
        <div className="mt-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 text-center text-sm text-stone-600 dark:text-stone-400">
          No price drops reported in the last {WINDOW_DAYS} days. Spotted one?{" "}
          <Link href="/search" className="text-teal-700 dark:text-teal-400 underline">
            Find the store
          </Link>{" "}
          and report what you paid.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {drops.slice(0, 20).map(({ o, prevCents, deltaCents }) => (
            <li key={o.id}>
              <Link
                href={`/stores/${o.store.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-teal-400 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                    {o.store.name}
                    {o.store.isDemo && (
                      <span className="ml-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-medium px-1 py-0.5 uppercase align-middle">
                        demo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {o.productLine.name} · {o.store.address}
                    {o.store.zip ? ` · ${o.store.zip}` : ""} · {timeAgo(o.observedAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p>
                    <span className="text-sm text-stone-400 line-through mr-1.5">
                      {formatCents(prevCents)}
                    </span>
                    <span className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {formatCents(o.priceCents)}
                    </span>
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    ▾ {formatCents(-deltaCents)} cheaper
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-stone-400">
        An entry here is evidence of a lower report, not a guarantee — check
        the store page for freshness and confidence before a special trip.
      </p>
    </div>
  );
}
