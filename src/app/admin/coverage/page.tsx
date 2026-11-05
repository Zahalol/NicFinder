import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coverage demand — NicFinder admin" };

// Demand signals ("I want prices in this area") aggregated by ZIP, joined
// against actual store/price coverage so expansion planning is one table:
// where people are asking, and whether we already serve them.

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function CoverageDemandPage() {
  const settings = await getSettings();
  const since7d = new Date(Date.now() - 7 * 86400_000);
  const freshCutoff = new Date(Date.now() - settings.expireAfterDays * 86400_000);

  const [requests, stores, pricedStoreRows] = await Promise.all([
    prisma.coverageRequest.findMany({
      select: { zip: true, city: true, state: true, userId: true, ipHash: true, createdAt: true, notifiedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.store.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, zip: true },
    }),
    prisma.priceObservation.findMany({
      where: {
        status: "ACTIVE",
        observedAt: { gte: freshCutoff },
        store: { status: "ACTIVE" },
      },
      select: { storeId: true },
      distinct: ["storeId"],
    }),
  ]);

  // Store coverage per ZIP.
  const storesByZip = new Map<string, number>();
  const pricedByZip = new Map<string, number>();
  const pricedStoreIds = new Set(pricedStoreRows.map((r) => r.storeId));
  for (const s of stores) {
    if (!s.zip) continue;
    storesByZip.set(s.zip, (storesByZip.get(s.zip) ?? 0) + 1);
    if (pricedStoreIds.has(s.id)) {
      pricedByZip.set(s.zip, (pricedByZip.get(s.zip) ?? 0) + 1);
    }
  }

  // Demand per ZIP.
  type ZipDemand = {
    zip: string;
    city: string | null;
    state: string | null;
    total: number;
    signedIn: number;
    recent7d: number;
    notified: number;
    lastAt: Date;
  };
  const byZip = new Map<string, ZipDemand>();
  for (const r of requests) {
    const row = byZip.get(r.zip) ?? {
      zip: r.zip,
      city: r.city,
      state: r.state,
      total: 0,
      signedIn: 0,
      recent7d: 0,
      notified: 0,
      lastAt: r.createdAt,
    };
    row.total += 1;
    if (r.userId) row.signedIn += 1;
    if (r.notifiedAt) row.notified += 1;
    if (r.createdAt >= since7d) row.recent7d += 1;
    if (r.createdAt > row.lastAt) row.lastAt = r.createdAt;
    if (!row.city && r.city) row.city = r.city;
    if (!row.state && r.state) row.state = r.state;
    byZip.set(r.zip, row);
  }
  const rows = [...byZip.values()].sort(
    (a, b) => b.total - a.total || b.lastAt.getTime() - a.lastAt.getTime()
  );
  const maxDemand = Math.max(1, ...rows.map((r) => r.total));

  const totalRequests = requests.length;
  const recent7d = requests.filter((r) => r.createdAt >= since7d).length;
  const unservedZips = rows.filter((r) => (storesByZip.get(r.zip) ?? 0) === 0).length;
  const topGap = rows.find((r) => (pricedByZip.get(r.zip) ?? 0) === 0);

  function statusBadge(zip: string) {
    const nStores = storesByZip.get(zip) ?? 0;
    const nPriced = pricedByZip.get(zip) ?? 0;
    if (nStores === 0) {
      return (
        <span className="inline-block rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
          No stores listed
        </span>
      );
    }
    if (nPriced === 0) {
      return (
        <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
          {nStores} store{nStores === 1 ? "" : "s"}, no current prices
        </span>
      );
    }
    return (
      <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
        {nPriced}/{nStores} store{nStores === 1 ? "" : "s"} priced
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Coverage demand</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Visitor requests for price coverage, grouped by ZIP and joined against
          current store/price coverage. Use the gaps at the top to choose the
          next neighborhoods to collect prices in.
        </p>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total requests", value: String(totalRequests) },
          { label: "Requests, last 7 days", value: String(recent7d) },
          { label: "ZIPs requested", value: String(rows.length) },
          {
            label: "Requested ZIPs with no stores",
            value: String(unservedZips),
          },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-2xl font-semibold text-stone-900">{t.value}</div>
            <div className="mt-0.5 text-xs text-stone-500">{t.label}</div>
          </div>
        ))}
      </div>

      {topGap && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Biggest gap right now: <strong>{topGap.zip}</strong>
          {topGap.city ? ` (${topGap.city}${topGap.state ? `, ${topGap.state}` : ""})` : ""} —{" "}
          {topGap.total} request{topGap.total === 1 ? "" : "s"} and no current prices.
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">
          No coverage requests yet. The “Request coverage” button appears on
          search results for areas without priced stores.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="py-1.5 pr-3">ZIP</th>
              <th className="py-1.5 pr-3">Area</th>
              <th className="py-1.5 pr-3">Requests</th>
              <th className="hidden py-1.5 pr-3 sm:table-cell">Signed-in</th>
              <th className="hidden py-1.5 pr-3 sm:table-cell">Last 7d</th>
              <th className="py-1.5 pr-3">Latest</th>
              <th className="py-1.5 pr-3">Coverage</th>
              <th className="hidden py-1.5 md:table-cell w-1/5">Demand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.zip} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="py-2 pr-3 font-medium text-stone-900">{r.zip}</td>
                <td className="py-2 pr-3 text-stone-600">
                  {r.city ? `${r.city}${r.state ? `, ${r.state}` : ""}` : "—"}
                </td>
                <td className="py-2 pr-3 text-stone-900">{r.total}</td>
                <td className="hidden py-2 pr-3 text-stone-600 sm:table-cell">{r.signedIn}</td>
                <td className="hidden py-2 pr-3 text-stone-600 sm:table-cell">{r.recent7d}</td>
                <td className="py-2 pr-3 text-stone-600">{timeAgo(r.lastAt)}</td>
                <td className="py-2 pr-3">
                  {statusBadge(r.zip)}
                  {r.notified > 0 && (
                    <span className="ml-1.5 text-[11px] text-teal-700" title="Requesters notified that coverage arrived">
                      {r.notified} notified
                    </span>
                  )}
                </td>
                <td className="hidden py-2 md:table-cell">
                  <div
                    className="h-2.5 min-w-[2px] rounded bg-teal-600"
                    style={{ width: `${(r.total / maxDemand) * 100}%` }}
                    title={`${r.total} request${r.total === 1 ? "" : "s"}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-xs text-stone-400">
        Guest requests are deduplicated per ZIP by daily-salted IP hash (raw IPs
        are never stored); signed-in users count once per ZIP per account.
      </p>
    </div>
  );
}
