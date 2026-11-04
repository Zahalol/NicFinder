import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { formatCents } from "@/lib/money";
import { DemoBadge } from "@/components/badges";
import { ContributePanel } from "./ContributePanel";
import { Comments } from "./Comments";

export const dynamic = "force-dynamic";

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

  const latestByLine = productLines.map((line) => ({
    line,
    latest: selectLatestPrice(
      store.observations.filter((o) => o.productLineId === line.id && o.status === "ACTIVE"),
      settings
    ),
  }));

  const mapsUrl =
    store.latitude !== null
      ? `https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=17/${store.latitude}/${store.longitude}`
      : null;

  return (
    <div className="py-6 max-w-3xl mx-auto">
      <Link href="/search?q=60614" className="text-sm text-stone-500 hover:text-stone-900">
        ← Back to search
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            {store.name} {store.isDemo && <DemoBadge />}
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

      {/* Current prices per product line */}
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {latestByLine.map(({ line, latest }) => (
          <div key={line.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-medium text-stone-500">{line.name}</h2>
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
