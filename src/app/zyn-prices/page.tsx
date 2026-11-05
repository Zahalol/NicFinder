// Covered-areas index: every ZIP we track, with live stats — the hub that
// the per-ZIP landing pages hang off.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { zipInfo } from "@/lib/geocode";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ZYN prices by area",
  description:
    "Every area NicFinder tracks, with store counts and current reported ZYN price ranges. Community-verified. Adults 21+.",
  alternates: { canonical: "/zyn-prices" },
};

export default async function ZipIndexPage() {
  const [settings, stores] = await Promise.all([
    getSettings(),
    prisma.store.findMany({
      where: { status: "ACTIVE", zip: { not: null } },
      select: {
        zip: true,
        observations: {
          where: { status: "ACTIVE", productLine: { slug: "zyn" } },
          include: { verifications: true },
          orderBy: { observedAt: "desc" },
          take: 5,
        },
      },
    }),
  ]);

  const byZip = new Map<string, { stores: number; prices: number[] }>();
  for (const s of stores) {
    const cur = byZip.get(s.zip!) ?? { stores: 0, prices: [] };
    cur.stores += 1;
    const latest = selectLatestPrice(s.observations, settings);
    if (latest) cur.prices.push(latest.observation.priceCents);
    byZip.set(s.zip!, cur);
  }
  const rows = [...byZip.entries()]
    .map(([zip, v]) => ({
      zip,
      city: zipInfo(zip)?.city ?? null,
      state: zipInfo(zip)?.state ?? null,
      stores: v.stores,
      priced: v.prices.length,
      low: v.prices.length ? Math.min(...v.prices) : null,
      high: v.prices.length ? Math.max(...v.prices) : null,
    }))
    .sort((a, b) => b.priced - a.priced || b.stores - a.stores || a.zip.localeCompare(b.zip));

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        ZYN prices by area
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Every area we currently track. Our pilot is Chicago, IL — searching an
        uncovered area lets you request coverage, and we expand to the
        most-requested places first.
      </p>

      <ul className="mt-6 space-y-2">
        {rows.map((r) => (
          <li key={r.zip}>
            <Link
              href={`/zyn-prices/${r.zip}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-teal-400 transition"
            >
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {r.city ? `${r.city}, ${r.state} ` : ""}
                  {r.zip}
                </p>
                <p className="text-xs text-stone-500">
                  {r.stores} store{r.stores === 1 ? "" : "s"} tracked ·{" "}
                  {r.priced > 0
                    ? `${r.priced} with reported prices`
                    : "no reported prices yet"}
                </p>
              </div>
              <div className="text-right shrink-0">
                {r.low !== null ? (
                  <>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {r.low === r.high
                        ? formatCents(r.low)
                        : `${formatCents(r.low)}–${formatCents(r.high)}`}
                    </p>
                    <p className="text-[11px] text-stone-500">per can</p>
                  </>
                ) : (
                  <p className="text-sm text-stone-400">directory only</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-stone-400">
        Ranges reflect current reported prices and may exclude tax. Areas with
        “directory only” list stores we track but have no verified price for —
        we never guess.
      </p>
    </div>
  );
}
