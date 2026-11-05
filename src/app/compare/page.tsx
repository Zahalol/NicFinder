// Two-store side-by-side comparison: the "which one do I actually drive to"
// view. Every number comes from the same selection/deal/reliability policy
// as the rest of the site — nothing is recomputed differently here.

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice, selectLatestAvailability } from "@/lib/prices";
import { assessReliability } from "@/lib/reliability";
import { effectivePerCanCents, totalCents, type DealInput } from "@/lib/deals";
import { haversineMiles } from "@/lib/geo";
import { formatCents } from "@/lib/money";
import { DemoBadge, ReliabilityBadge } from "@/components/badges";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Compare stores — NicFinder",
  // Parameterized pairwise pages: crawl bloat with no standalone value.
  robots: { index: false, follow: true },
};

const QTYS = [1, 3, 5, 10];

async function loadStore(id: string) {
  return prisma.store.findUnique({
    where: { id },
    include: {
      observations: {
        where: { status: "ACTIVE" },
        include: { verifications: true },
        orderBy: { observedAt: "desc" },
        take: 30,
      },
      deals: {
        where: {
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: { observedAt: "desc" },
      },
    },
  });
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const idA = params.a ?? "";
  const idB = params.b ?? "";
  const qty = QTYS.includes(Number(params.qty)) ? Number(params.qty) : 5;
  const lat = params.lat ? Number(params.lat) : null;
  const lng = params.lng ? Number(params.lng) : null;
  const hasCenter =
    lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  const settings = await getSettings();
  const [a, b, productLines] = await Promise.all([
    idA ? loadStore(idA) : null,
    idB ? loadStore(idB) : null,
    prisma.productLine.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!a || !b || a.status !== "ACTIVE" || b.status !== "ACTIVE") {
    return (
      <div className="py-10 max-w-2xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Compare stores</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Pick two stores to compare — use the “Compare” buttons on{" "}
          <Link href="/search" className="text-teal-700 dark:text-teal-400 underline">search results</Link>.
        </p>
      </div>
    );
  }

  function describe(store: typeof a) {
    const byLine = productLines.map((line) => {
      const obs = store!.observations.filter((o) => o.productLineId === line.id);
      const latest = selectLatestPrice(obs, settings);
      const avail = selectLatestAvailability(obs, settings);
      const dealRow = store!.deals.find((d) => d.productLineId === line.id) ?? null;
      const deal: DealInput | null = dealRow
        ? {
            minQty: dealRow.minQty,
            pricePerCanCents: dealRow.pricePerCanCents,
            discountPerCanCents: dealRow.discountPerCanCents,
            appliesAboveMinQty: dealRow.appliesAboveMinQty,
          }
        : null;
      const regular = latest?.observation.priceCents ?? null;
      return {
        line,
        latest,
        avail,
        dealRow,
        eff: effectivePerCanCents(regular, deal, qty),
        total: totalCents(regular, deal, qty),
        reliability: latest
          ? assessReliability({
              ageDays: latest.ageDays,
              staleAfterDays: settings.staleAfterDays,
              sourceType: latest.observation.sourceType,
              confirmCount: latest.confirmCount,
              disputeCount: latest.disputeCount,
              confidence: latest.observation.confidence,
            })
          : null,
      };
    });
    const distance =
      hasCenter && store!.latitude !== null && store!.longitude !== null
        ? Math.round(haversineMiles(lat!, lng!, store!.latitude, store!.longitude) * 10) / 10
        : null;
    return { store: store!, byLine, distance };
  }

  const A = describe(a);
  const B = describe(b);

  function qtyHref(n: number) {
    const p = new URLSearchParams();
    p.set("a", idA);
    p.set("b", idB);
    p.set("qty", String(n));
    if (hasCenter) {
      p.set("lat", String(lat));
      p.set("lng", String(lng));
    }
    return `/compare?${p.toString()}`;
  }

  function StoreHeader({ d }: { d: typeof A }) {
    return (
      <div>
        <Link
          href={`/stores/${d.store.id}`}
          className="font-semibold text-stone-900 dark:text-stone-100 hover:underline"
        >
          {d.store.name}
        </Link>{" "}
        {d.store.isDemo && <DemoBadge />}
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {d.store.address}
          {d.store.city ? `, ${d.store.city}` : ""}
          {d.distance !== null && ` · ${d.distance} mi away`}
        </p>
      </div>
    );
  }

  function PriceCell({
    d,
    lineId,
  }: {
    d: typeof A;
    lineId: string;
  }) {
    const row = d.byLine.find((x) => x.line.id === lineId)!;
    if (!row.latest) {
      return (
        <div className="text-sm text-stone-400">
          {row.avail?.availability === "NOT_CARRIED"
            ? "Not carried (reported)"
            : row.avail?.availability === "OUT_OF_STOCK"
              ? "Out of stock (reported)"
              : "No recent price"}
        </div>
      );
    }
    return (
      <div>
        <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          {formatCents(row.latest.observation.priceCents)}
          <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/can</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-xs text-stone-500 dark:text-stone-400">
          <span>{row.latest.ageDays === 0 ? "today" : `${row.latest.ageDays}d ago`}</span>
          {row.reliability && <ReliabilityBadge reliability={row.reliability} />}
        </div>
      </div>
    );
  }

  function QtyCell({ d, lineId }: { d: typeof A; lineId: string }) {
    const row = d.byLine.find((x) => x.line.id === lineId)!;
    if (row.total === null || row.eff.perCanCents === null)
      return <div className="text-sm text-stone-400">—</div>;
    return (
      <div className="text-sm text-stone-800 dark:text-stone-200">
        <strong>{formatCents(row.total)}</strong> total{" "}
        <span className="text-stone-500 dark:text-stone-400">({formatCents(row.eff.perCanCents)}/can)</span>
        {row.eff.usedDeal && <span className="text-teal-700 dark:text-teal-400"> · deal applied</span>}
        {row.eff.uncertain && (
          <span className="text-amber-600 dark:text-amber-400"> · deal terms unknown at {qty}</span>
        )}
        {row.dealRow && !row.eff.usedDeal && qty < row.dealRow.minQty && (
          <div className="text-xs text-stone-500 dark:text-stone-400">
            deal starts at {row.dealRow.minQty} cans
          </div>
        )}
      </div>
    );
  }

  const winner = (() => {
    const ra = A.byLine.find((x) => x.line.slug === "zyn");
    const rb = B.byLine.find((x) => x.line.slug === "zyn");
    if (!ra?.total || !rb?.total || ra.total === rb.total) return null;
    const cheaper = ra.total < rb.total ? A : B;
    const diff = Math.abs(ra.total - rb.total);
    return { name: cheaper.store.name, diff };
  })();

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <BackLink fallback="/search">← Back to search</BackLink>
      <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-stone-100">Compare stores</h1>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-stone-500 dark:text-stone-400">Buying</span>
        <span className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden">
          {QTYS.map((n) => (
            <Link
              key={n}
              href={qtyHref(n)}
              aria-current={qty === n ? "true" : undefined}
              className={`px-2.5 py-1 ${qty === n ? "bg-teal-600 text-white" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}
            >
              {n}
            </Link>
          ))}
        </span>
        <span className="text-stone-500 dark:text-stone-400">can{qty > 1 ? "s" : ""}</span>
      </div>

      {winner && (
        <p className="mt-3 rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 px-3 py-2 text-sm text-teal-900 dark:text-teal-200">
          <strong>{winner.name}</strong> is {formatCents(winner.diff)} cheaper in
          total for {qty} can{qty > 1 ? "s" : ""} of regular ZYN.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr>
              <th className="w-28 py-2 pr-2 align-bottom text-xs font-normal text-stone-400"></th>
              <th className="py-2 pr-4 font-normal"><StoreHeader d={A} /></th>
              <th className="py-2 font-normal"><StoreHeader d={B} /></th>
            </tr>
          </thead>
          <tbody>
            {productLines.map((line) => (
              <tr key={line.id} className="border-t border-stone-200 dark:border-stone-700 align-top">
                <td className="py-3 pr-2 text-xs text-stone-500 dark:text-stone-400">{line.name}</td>
                <td className="py-3 pr-4"><PriceCell d={A} lineId={line.id} /></td>
                <td className="py-3"><PriceCell d={B} lineId={line.id} /></td>
              </tr>
            ))}
            {productLines
              .filter((line) =>
                [A, B].some(
                  (d) => d.byLine.find((x) => x.line.id === line.id)?.total !== null
                )
              )
              .map((line) => (
                <tr key={`qty-${line.id}`} className="border-t border-stone-200 dark:border-stone-700 align-top">
                  <td className="py-3 pr-2 text-xs text-stone-500 dark:text-stone-400">
                    {qty} can{qty > 1 ? "s" : ""} of {line.name}
                  </td>
                  <td className="py-3 pr-4"><QtyCell d={A} lineId={line.id} /></td>
                  <td className="py-3"><QtyCell d={B} lineId={line.id} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-stone-400">
        Prices are reported observations, not guarantees — check the freshness
        and confidence chips, and confirm with the store before a special trip.
      </p>
    </div>
  );
}
