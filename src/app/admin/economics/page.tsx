import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { EconomicsCalculator } from "./EconomicsCalculator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pilot economics — NicFinder admin" };

// Admin-only planning view: what real coverage looks like today, and what an
// automated refresh program would cost under explicit assumptions.
// Nothing on this page initiates calls — outbound calling remains a
// separately authorized workstream (docs/ELEVENLABS_CALLING_RESEARCH.md).

export default async function EconomicsPage() {
  const settings = await getSettings();
  const freshCutoff = new Date(Date.now() - settings.staleAfterDays * 86400_000);
  const expireCutoff = new Date(Date.now() - settings.expireAfterDays * 86400_000);

  const [realStores, demoStores, freshStores, currentStores, obsAges] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE", isDemo: false } }),
    prisma.store.count({ where: { status: "ACTIVE", isDemo: true } }),
    prisma.priceObservation.findMany({
      where: {
        status: "ACTIVE",
        observedAt: { gte: freshCutoff },
        priceCents: { not: null },
        store: { status: "ACTIVE", isDemo: false },
      },
      select: { storeId: true },
      distinct: ["storeId"],
    }),
    prisma.priceObservation.findMany({
      where: {
        status: "ACTIVE",
        observedAt: { gte: expireCutoff },
        priceCents: { not: null },
        store: { status: "ACTIVE", isDemo: false },
      },
      select: { storeId: true },
      distinct: ["storeId"],
    }),
    prisma.priceObservation.findMany({
      where: {
        status: "ACTIVE",
        priceCents: { not: null },
        store: { status: "ACTIVE", isDemo: false },
      },
      select: { observedAt: true },
      orderBy: { observedAt: "desc" },
      take: 500,
    }),
  ]);

  const fresh = freshStores.length;
  const current = currentStores.length;
  const stale = current - fresh;
  const unpriced = realStores - current;
  const medianAgeDays = obsAges.length
    ? Math.round(
        (Date.now() -
          obsAges[Math.floor(obsAges.length / 2)].observedAt.getTime()) /
          86400_000
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-stone-900">Pilot economics</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Real-store coverage today, and what keeping it fresh would cost under
          assumptions you control. This page never initiates calls.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Real stores (non-demo)", value: String(realStores) },
          { label: `Fresh prices (≤${settings.staleAfterDays}d)`, value: String(fresh) },
          { label: "Stale but current", value: String(stale) },
          { label: "No current price", value: String(unpriced) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-2xl font-semibold text-stone-900">{t.value}</div>
            <div className="mt-0.5 text-xs text-stone-500">{t.label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        {demoStores > 0 &&
          `${demoStores} fictional demo stores are excluded from everything on this page. `}
        {medianAgeDays !== null
          ? `Median age of real-store price observations: ${medianAgeDays} day${medianAgeDays === 1 ? "" : "s"}.`
          : "No real-store price observations yet — the pilot's data collection (G1) hasn't started."}
      </p>

      <EconomicsCalculator
        stats={{
          realStores,
          realPricedFresh: fresh,
          realPricedStale: stale,
          demoStores,
        }}
      />
    </div>
  );
}
