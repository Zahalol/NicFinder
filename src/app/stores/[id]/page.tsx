import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { effectivePerCanCents, totalCents, type DealInput } from "@/lib/deals";
import { formatCents } from "@/lib/money";
import { DemoBadge, ConfidenceBadge } from "@/components/badges";
import { computeConfidence } from "@/lib/confidence";
import { PriceSparkline, trendSummary, type SparkPoint } from "@/components/PriceSparkline";
import { BackLink } from "@/components/BackLink";
import { SaveStoreButton } from "@/components/SaveStoreButton";
import { ShareButton } from "@/components/ShareButton";
import { MiniMap } from "@/components/MiniMap";
import { ContributePanel } from "./ContributePanel";
import { Comments } from "./Comments";

export const dynamic = "force-dynamic";

/** Compact what-it-costs strip: totals at common quantities, deal-aware. */
function QtyCostTable({
  regularCents,
  deal,
}: {
  regularCents: number;
  deal: DealInput | null;
}) {
  const qtys = [1, 3, 5, 10];
  const cells = qtys.map((qty) => {
    const eff = effectivePerCanCents(regularCents, deal, qty);
    const total = totalCents(regularCents, deal, qty);
    return { qty, eff, total };
  });
  // Without a deal every row is just multiplication — not worth the pixels.
  if (!deal) return null;
  const anyUnknown = cells.some((c) => c.total === null);

  return (
    <div className="mt-3 border-t border-stone-100 pt-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
        What you&apos;d pay
      </p>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
        {cells.map(({ qty, eff, total }) => (
          <div
            key={qty}
            className={`rounded-lg border px-1 py-1.5 ${
              eff.usedDeal
                ? "border-teal-200 bg-teal-50/60"
                : "border-stone-150 bg-stone-50"
            }`}
          >
            <div className="text-[10px] text-stone-400">
              {qty} can{qty > 1 ? "s" : ""}
            </div>
            {total !== null ? (
              <>
                <div className="text-sm font-semibold text-stone-800">
                  {formatCents(total)}
                </div>
                <div className="text-[10px] text-stone-500">
                  {formatCents(eff.perCanCents)}/can
                  {eff.usedDeal ? " · deal" : ""}
                </div>
              </>
            ) : (
              <div className="text-sm text-stone-400" title="Deal terms at this quantity are unknown">
                ?
              </div>
            )}
          </div>
        ))}
      </div>
      {anyUnknown && (
        <p className="mt-1 text-[10px] text-stone-400">
          ? = the reported deal&apos;s terms at that quantity are unknown — we don&apos;t guess.
        </p>
      )}
    </div>
  );
}

function TrendLine({ history }: { history: SparkPoint[] }) {
  const trend = trendSummary(history);
  if (!trend) return null;
  const { deltaCents, days } = trend;
  const span = days >= 30 ? `${Math.round(days / 30)} mo` : `${days}d`;
  return (
    <p className="mt-1 text-xs text-stone-500">
      {deltaCents === 0 ? (
        <>Steady over the last {span} of reports</>
      ) : deltaCents < 0 ? (
        <span className="text-emerald-700">
          ▾ down {formatCents(-deltaCents)} over {span} of reports
        </span>
      ) : (
        <span className="text-amber-700">
          ▴ up {formatCents(deltaCents)} over {span} of reports
        </span>
      )}
    </p>
  );
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [store, user, settings, productLines] = await Promise.all([
    prisma.store.findUnique({
      where: { id },
      include: {
        observations: {
          where: { status: { in: ["ACTIVE", "SUPERSEDED"] } },
          include: { verifications: true, productLine: true },
          orderBy: { observedAt: "desc" },
          take: 50,
        },
        deals: {
          where: { status: "ACTIVE" },
          include: { productLine: true },
          orderBy: { observedAt: "desc" },
        },
        comments: {
          where: { status: "VISIBLE" },
          include: { user: { select: { id: true, displayName: true, reputation: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    }),
    getCurrentUser().catch(() => null),
    getSettings(),
    prisma.productLine.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!store || store.status !== "ACTIVE") notFound();

  const saved = user
    ? (await prisma.savedStore.findFirst({
        where: { userId: user.id, storeId: store.id },
        select: { id: true },
      })) !== null
    : false;

  const HISTORY_WINDOW_DAYS = 180;
  const historyCutoff = Date.now() - HISTORY_WINDOW_DAYS * 86400_000;
  const latestByLine = productLines.map((line) => ({
    line,
    latest: selectLatestPrice(
      store.observations.filter((o) => o.productLineId === line.id && o.status === "ACTIVE"),
      settings
    ),
    // History sparkline: every recorded observation (active or superseded)
    // for this line in the window — the honest trajectory of reports.
    history: store.observations
      .filter((o) => o.productLineId === line.id && o.observedAt.getTime() >= historyCutoff)
      .map((o): SparkPoint => ({ t: o.observedAt.getTime(), cents: o.priceCents })),
    deal: ((d) =>
      d
        ? {
            minQty: d.minQty,
            pricePerCanCents: d.pricePerCanCents,
            discountPerCanCents: d.discountPerCanCents,
            appliesAboveMinQty: d.appliesAboveMinQty,
          }
        : null)(
      store.deals.find(
        (d) =>
          d.productLineId === line.id &&
          (d.expiresAt === null || d.expiresAt >= new Date())
      )
    ),
  }));

  const mapsUrl =
    store.latitude !== null
      ? `https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=17/${store.latitude}/${store.longitude}`
      : null;

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <BackLink fallback="/search?q=60614">← Back to search</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2 flex-wrap">
            {store.name} {store.isDemo && <DemoBadge />}
            <span className="inline-flex items-center gap-1.5">
              <SaveStoreButton storeId={store.id} initialSaved={saved} signedIn={Boolean(user)} />
              <ShareButton title={`${store.name} — ZYN prices`} />
            </span>
          </h1>
          <p className="text-stone-500 mt-1">
            {store.address}
            {store.city ? `, ${store.city}` : ""}
            {store.state ? `, ${store.state}` : ""} {store.zip ?? ""}
          </p>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 underline">
              Directions / map
            </a>
          )}
        </div>
      </div>

      {store.isDemo && (
        <p className="mt-3 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3">
          This is a fictional demonstration store. All prices here are
          synthetic sample data.
        </p>
      )}

      {store.latitude !== null && store.longitude !== null && (
        <div className="mt-4">
          <MiniMap lat={store.latitude} lng={store.longitude} name={store.name} />
        </div>
      )}

      {/* Current prices per product line */}
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {latestByLine.map(({ line, latest, history, deal }) => (
          <div key={line.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-stone-500">{line.name}</h2>
              {latest && (
                <span className="text-xs">
                  <ConfidenceBadge
                    input={{
                      sourceType: latest.observation.sourceType,
                      ageDays: latest.ageDays,
                      confirmCount: latest.confirmCount,
                      disputeCount: latest.disputeCount,
                    }}
                  />
                </span>
              )}
            </div>
            {latest ? (
              <>
                <div className="mt-1 text-3xl font-semibold text-stone-900">
                  {formatCents(latest.observation.priceCents)}
                  <span className="text-sm font-normal text-stone-500"> /can</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Observed {latest.observation.observedAt.toLocaleDateString()} ·{" "}
                  {latest.observation.sourceType === "COMMUNITY"
                    ? "community-reported"
                    : latest.observation.sourceType === "CALL"
                      ? "store call"
                      : latest.observation.sourceType === "IMPORT"
                        ? "data import"
                        : "staff-entered"}
                  {latest.freshness === "stale" && (
                    <span className="text-amber-600"> · {latest.ageDays}d old — may be outdated</span>
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  {latest.observation.taxIncluded === false
                    ? "Before tax"
                    : latest.observation.taxIncluded === true
                      ? "Tax included"
                      : "Tax status unknown"}
                  {latest.confirmCount > 0 && (
                    <span className="text-teal-700"> · ✓ confirmed by {latest.confirmCount}</span>
                  )}
                  {latest.observation.availability === "OUT_OF_STOCK" && (
                    <span className="text-red-600"> · reported out of stock</span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-stone-400">
                  Confidence:{" "}
                  {computeConfidence({
                    sourceType: latest.observation.sourceType,
                    ageDays: latest.ageDays,
                    confirmCount: latest.confirmCount,
                    disputeCount: latest.disputeCount,
                  }).reasons.join(" · ")}
                </p>
                <QtyCostTable regularCents={latest.observation.priceCents} deal={deal} />
                {history.length >= 2 && (
                  <div className="mt-3 border-t border-stone-100 pt-2">
                    <PriceSparkline points={history} />
                    <TrendLine history={history} />
                  </div>
                )}
              </>
            ) : (
              <div className="mt-1">
                <div className="text-xl font-medium text-stone-400">No recent price</div>
                <p className="text-xs text-stone-500 mt-1">
                  {line.slug === "zyn-ultra"
                    ? "Ultra pricing hasn’t been reported here. Ultra is not assumed to match the regular price."
                    : "No one has reported a price for this store yet."}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Deals */}
      {store.deals.length > 0 && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-5">
          <h2 className="text-sm font-medium text-teal-900">Quantity deals</h2>
          <ul className="mt-2 space-y-2">
            {store.deals.map((d) => (
              <li key={d.id} className="text-sm text-stone-700">
                <strong>{d.productLine.name}:</strong> buy {d.minQty}+ —{" "}
                {d.pricePerCanCents !== null
                  ? `${formatCents(d.pricePerCanCents)} per can`
                  : `${formatCents(d.discountPerCanCents)} off per can`}
                {d.appliesAboveMinQty === false && ` (first ${d.minQty} cans only)`}
                {d.appliesAboveMinQty === null && (
                  <span className="text-stone-500"> — terms above {d.minQty} cans unknown</span>
                )}
                {d.conditions && <span className="text-stone-500"> · {d.conditions}</span>}
                {d.expiresAt && (
                  <span className="text-stone-500"> · until {d.expiresAt.toLocaleDateString()}</span>
                )}
                <span className="text-xs text-stone-400"> · reported {d.observedAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contribute */}
      <ContributePanel
        storeId={store.id}
        productLines={productLines.map((l) => ({ id: l.id, slug: l.slug, name: l.name }))}
        latest={Object.fromEntries(
          latestByLine.map(({ line, latest }) => [
            line.id,
            latest
              ? { observationId: latest.observation.id, priceCents: latest.observation.priceCents }
              : null,
          ])
        )}
        signedIn={Boolean(user)}
      />

      {/* Price history */}
      <div className="mt-8">
        <h2 className="font-medium text-stone-900">Price history</h2>
        {store.observations.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No observations recorded.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                <th className="py-1.5 pr-2">Observed</th>
                <th className="py-1.5 pr-2">Product</th>
                <th className="py-1.5 pr-2">Price</th>
                <th className="py-1.5 pr-2">Source</th>
                <th className="py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {store.observations.map((o) => (
                <tr key={o.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-1.5 pr-2">{o.observedAt.toLocaleDateString()}</td>
                  <td className="py-1.5 pr-2">{o.productLine.name}</td>
                  <td className="py-1.5 pr-2 font-medium">{formatCents(o.priceCents)}</td>
                  <td className="py-1.5 pr-2 text-stone-500">{o.sourceType.toLowerCase()}</td>
                  <td className="py-1.5 text-xs text-stone-400">{o.status.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Comments */}
      <Comments
        storeId={store.id}
        comments={store.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
        }))}
        currentUserId={user?.id ?? null}
      />

      <p className="mt-8 text-xs text-stone-400">
        Prices vary by location and over time, usually exclude tax, and depend
        on stock. NicFinder aggregates reported observations and cannot
        guarantee accuracy — confirm with the store before a special trip.
      </p>
    </div>
  );
}
