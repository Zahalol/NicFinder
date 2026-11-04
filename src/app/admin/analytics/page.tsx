import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — NicFinder admin" };

// Charts here are single-series magnitude comparisons rendered as semantic
// tables with inline range/magnitude bars: one hue, values as text labels,
// no legend needed (single series), table view built in.

export default async function AnalyticsPage() {
  const settings = await getSettings();
  const [zyn, observations, contributions, coverageRequests] = await Promise.all([
    prisma.productLine.findUnique({ where: { slug: "zyn" } }),
    prisma.priceObservation.findMany({
      where: { status: "ACTIVE", store: { status: "ACTIVE" } },
      include: { store: { select: { id: true, zip: true, isDemo: true } }, verifications: true },
    }),
    prisma.contribution.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 56 * 86400_000) } },
      select: { createdAt: true, kind: true },
    }),
    prisma.coverageRequest.count(),
  ]);

  // Latest ZYN price per store (same policy the site uses).
  const byStore = new Map<string, typeof observations>();
  for (const o of observations) {
    if (zyn && o.productLineId !== zyn.id) continue;
    byStore.set(o.storeId, [...(byStore.get(o.storeId) ?? []), o]);
  }
  const latest: { storeId: string; zip: string | null; priceCents: number; ageDays: number; isDemo: boolean }[] = [];
  for (const [storeId, obs] of byStore) {
    const sel = selectLatestPrice(obs, settings);
    if (sel) {
      latest.push({
        storeId,
        zip: obs[0].store.zip,
        priceCents: sel.observation.priceCents,
        ageDays: sel.ageDays,
        isDemo: obs[0].store.isDemo,
      });
    }
  }

  // --- Per-ZIP dispersion -------------------------------------------------
  const byZip = new Map<string, number[]>();
  for (const l of latest) {
    if (!l.zip) continue;
    byZip.set(l.zip, [...(byZip.get(l.zip) ?? []), l.priceCents]);
  }
  const globalMin = latest.length ? Math.min(...latest.map((l) => l.priceCents)) : 0;
  const globalMax = latest.length ? Math.max(...latest.map((l) => l.priceCents)) : 1;
  const span = Math.max(1, globalMax - globalMin);
  const zipRows = [...byZip.entries()]
    .map(([zip, prices]) => ({
      zip,
      n: prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }))
    .sort((a, b) => b.n - a.n);

  // --- Freshness buckets ----------------------------------------------------
  const buckets = [
    { label: "0–7 days", max: 7, n: 0 },
    { label: "8–21 days (fresh)", max: settings.staleAfterDays, n: 0 },
    { label: `22–${settings.expireAfterDays} days (stale)`, max: settings.expireAfterDays, n: 0 },
  ];
  for (const l of latest) {
    const b = buckets.find((b) => l.ageDays <= b.max);
    if (b) b.n += 1;
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));

  // --- Contributions per week -----------------------------------------------
  const weeks: { label: string; confirms: number; disputes: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(Date.now() - (w + 1) * 7 * 86400_000);
    const end = new Date(Date.now() - w * 7 * 86400_000);
    const inWeek = contributions.filter((c) => c.createdAt >= start && c.createdAt < end);
    weeks.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      confirms: inWeek.filter((c) => c.kind === "CONFIRM").length,
      disputes: inWeek.filter((c) => c.kind === "DISPUTE").length,
    });
  }
  const maxWeek = Math.max(1, ...weeks.map((w) => w.confirms + w.disputes));

  const allPrices = latest.map((l) => l.priceCents).sort((a, b) => a - b);
  const median = allPrices.length ? allPrices[Math.floor(allPrices.length / 2)] : null;

  return (
    <div className="space-y-8">
      {/* Headline stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Stores with current prices", value: String(latest.length) },
          { label: "Median ZYN price", value: median !== null ? formatCents(median) : "—" },
          {
            label: "Citywide spread",
            value: latest.length > 1 ? `${formatCents(globalMin)}–${formatCents(globalMax)}` : "—",
          },
          { label: "Coverage requests", value: String(coverageRequests) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-2xl font-semibold text-stone-900">{t.value}</div>
            <div className="text-xs text-stone-500 mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Price dispersion per ZIP */}
      <section>
        <h2 className="font-medium text-stone-900">Price range by ZIP (latest ZYN price per store)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Bars show each ZIP’s min–max range on the citywide price scale
          ({formatCents(globalMin)} – {formatCents(globalMax)}). Demo-store prices included while DEMO_MODE is on.
        </p>
        {zipRows.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">No priced stores yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-1.5 pr-3">ZIP</th>
                <th className="py-1.5 pr-3">Stores</th>
                <th className="py-1.5 pr-3">Min</th>
                <th className="py-1.5 pr-3">Avg</th>
                <th className="py-1.5 pr-3">Max</th>
                <th className="py-1.5 w-1/3">Range</th>
              </tr>
            </thead>
            <tbody>
              {zipRows.map((r) => {
                const left = ((r.min - globalMin) / span) * 100;
                const width = Math.max(2, ((r.max - r.min) / span) * 100);
                return (
                  <tr key={r.zip} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-1.5 pr-3 font-medium text-stone-900">{r.zip}</td>
                    <td className="py-1.5 pr-3 text-stone-600">{r.n}</td>
                    <td className="py-1.5 pr-3 text-stone-600">{formatCents(r.min)}</td>
                    <td className="py-1.5 pr-3 text-stone-600">{formatCents(r.avg)}</td>
                    <td className="py-1.5 pr-3 text-stone-600">{formatCents(r.max)}</td>
                    <td className="py-1.5">
                      <div className="relative h-2.5 rounded bg-stone-100"
                        title={`${r.zip}: ${formatCents(r.min)}–${formatCents(r.max)} across ${r.n} store${r.n === 1 ? "" : "s"}`}>
                        <div
                          className="absolute top-0 h-2.5 rounded bg-teal-600"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Freshness */}
      <section>
        <h2 className="font-medium text-stone-900">Price freshness (age of each store’s latest price)</h2>
        <table className="mt-3 w-full max-w-xl text-sm">
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label} className="hover:bg-stone-50">
                <td className="py-1.5 pr-3 w-44 text-stone-600">{b.label}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2" title={`${b.n} store${b.n === 1 ? "" : "s"}`}>
                    <div
                      className="h-2.5 rounded bg-teal-600 min-w-[2px]"
                      style={{ width: `${(b.n / maxBucket) * 100}%`, maxWidth: "calc(100% - 2.5rem)" }}
                    />
                    <span className="text-stone-700 text-xs">{b.n}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Contributions over time */}
      <section>
        <h2 className="font-medium text-stone-900">Community contributions by week (last 8 weeks)</h2>
        <table className="mt-3 w-full max-w-xl text-sm">
          <tbody>
            {weeks.map((w) => {
              const total = w.confirms + w.disputes;
              return (
                <tr key={w.label} className="hover:bg-stone-50">
                  <td className="py-1.5 pr-3 w-20 text-stone-600">{w.label}</td>
                  <td className="py-1.5">
                    <div
                      className="flex items-center gap-2"
                      title={`${w.confirms} confirmation${w.confirms === 1 ? "" : "s"}, ${w.disputes} price report${w.disputes === 1 ? "" : "s"}`}
                    >
                      <div
                        className="h-2.5 rounded bg-teal-600 min-w-[2px]"
                        style={{ width: `${(total / maxWeek) * 100}%`, maxWidth: "calc(100% - 8rem)" }}
                      />
                      <span className="text-stone-700 text-xs">
                        {total}
                        {total > 0 && (
                          <span className="text-stone-400"> ({w.confirms} confirm / {w.disputes} report)</span>
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
