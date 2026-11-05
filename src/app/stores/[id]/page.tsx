import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice, selectLatestAvailability } from "@/lib/prices";
import { formatCents } from "@/lib/money";
import { DemoBadge, ReliabilityBadge } from "@/components/badges";
import { assessReliability } from "@/lib/reliability";
import { BackLink } from "@/components/BackLink";
import { SaveStoreButton } from "@/components/SaveStoreButton";
import { ShareButton } from "@/components/ShareButton";
import { ContributePanel } from "./ContributePanel";
import { Comments } from "./Comments";
import { FlagObservationButton } from "./FlagObservationButton";
import { FlagDealButton } from "./FlagDealButton";
import { PriceHistorySparkline } from "@/components/PriceHistorySparkline";
import { searchStores } from "@/lib/search";

export const dynamic = "force-dynamic";

// +13125550101 -> (312) 555-0101 for display; href keeps E.164.
function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    select: { name: true, city: true, state: true, isDemo: true, status: true },
  });
  if (!store || store.status !== "ACTIVE") return { title: "Store — NicFinder" };
  const place = [store.city, store.state].filter(Boolean).join(", ");
  const title = `ZYN prices at ${store.name}${place ? ` — ${place}` : ""}`;
  const description = `Reported ZYN nicotine pouch prices, deals and availability at ${store.name}${place ? ` in ${place}` : ""}. Community-verified observations with freshness and confidence shown. Adults 21+ — informational only, nothing is sold here.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    // Fictional demo stores must never be indexed as if they were real places.
    robots: store.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [store, user, settings, productLines, pendingReports] = await Promise.all([
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
    prisma.contribution.count({
      where: { storeId: id, status: { in: ["PENDING", "CORROBORATING"] } },
    }),
  ]);

  if (!store || store.status !== "ACTIVE") notFound();

  const saved = user
    ? (await prisma.savedStore.findFirst({
        where: { userId: user.id, storeId: store.id },
        select: { id: true },
      })) !== null
    : false;

  const latestByLine = productLines.map((line) => {
    const lineObs = store.observations.filter(
      (o) => o.productLineId === line.id && o.status === "ACTIVE"
    );
    return {
      line,
      latest: selectLatestPrice(lineObs, settings),
      avail: selectLatestAvailability(lineObs, settings),
    };
  });

  // Up to 3 nearby alternatives within 2 miles, reusing the exact search
  // policy (latest-price selection, deal handling) — cheapest first, this
  // store excluded. Nothing invented for unpriced neighbors.
  const nearby =
    store.latitude !== null && store.longitude !== null
      ? (
          await searchStores({
            lat: store.latitude,
            lng: store.longitude,
            radiusMiles: 2,
            productSlug: "zyn",
            qty: 1,
            sort: "price",
          })
        ).results
          .filter((r) => r.id !== store.id)
          .slice(0, 3)
      : [];
  const thisZynPrice =
    latestByLine.find((x) => x.line.slug === "zyn")?.latest?.observation
      .priceCents ?? null;

  const mapsUrl =
    store.latitude !== null
      ? `https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=17/${store.latitude}/${store.longitude}`
      : null;

  // LocalBusiness structured data — real stores only. Emitting a fictional
  // demo store as a real place would be dishonest structured data.
  const jsonLd = !store.isDemo
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: store.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: store.address ?? undefined,
          addressLocality: store.city ?? undefined,
          addressRegion: store.state ?? undefined,
          postalCode: store.zip ?? undefined,
          addressCountry: "US",
        },
        ...(store.latitude !== null && store.longitude !== null
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: store.latitude,
                longitude: store.longitude,
              },
            }
          : {}),
        ...(store.phone ? { telephone: store.phone } : {}),
      }
    : null;

  return (
    <div className="py-6 max-w-3xl mx-auto">
      {jsonLd && (
        <script
          type="application/ld+json"
          // escape "<" so a store name can never close the script tag
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <BackLink fallback="/search?q=60614">← Back to search</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            {store.name} {store.isDemo && <DemoBadge />}
            <SaveStoreButton storeId={store.id} initialSaved={saved} signedIn={Boolean(user)} />
            <ShareButton title={`ZYN prices at ${store.name}`} />
          </h1>
          <p className="text-stone-500 mt-1">
            {store.address}
            {store.city ? `, ${store.city}` : ""}
            {store.state ? `, ${store.state}` : ""} {store.zip ?? ""}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
                Directions / map
              </a>
            )}
            {store.phone && (
              <a href={`tel:${store.phone}`} className="text-teal-700 underline">
                Call to confirm: {formatPhone(store.phone)}
              </a>
            )}
            {store.hours && (
              <span className="text-stone-500">Hours: {store.hours}</span>
            )}
          </p>
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
        {latestByLine.map(({ line, latest, avail }) => (
          <div key={line.id} className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-medium text-stone-500">{line.name}</h2>
            {latest ? (
              <>
                <div className="mt-1 text-3xl font-semibold text-stone-900 flex items-baseline gap-2 flex-wrap">
                  <span>
                    {formatCents(latest.observation.priceCents)}
                    <span className="text-sm font-normal text-stone-500"> /can</span>
                  </span>
                  <ReliabilityBadge
                    reliability={assessReliability({
                      ageDays: latest.ageDays,
                      staleAfterDays: settings.staleAfterDays,
                      sourceType: latest.observation.sourceType,
                      confirmCount: latest.confirmCount,
                      disputeCount: latest.disputeCount,
                      confidence: latest.observation.confidence,
                    })}
                  />
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
                {avail &&
                  avail.observedAt > latest.observation.observedAt &&
                  avail.availability !== "IN_STOCK" && (
                    <p className="mt-1 text-xs text-red-600">
                      Newer report ({avail.observedAt.toLocaleDateString()}):{" "}
                      {avail.availability === "NOT_CARRIED" ? "no longer carried" : "out of stock"}
                    </p>
                  )}
              </>
            ) : avail && avail.availability === "NOT_CARRIED" ? (
              <div className="mt-1">
                <div className="text-xl font-medium text-stone-500">Not carried</div>
                <p className="text-xs text-stone-500 mt-1">
                  Reported {avail.observedAt.toLocaleDateString()} as not carrying{" "}
                  {line.name}. No price is shown because none exists.
                </p>
              </div>
            ) : avail && avail.availability === "OUT_OF_STOCK" ? (
              <div className="mt-1">
                <div className="text-xl font-medium text-red-600">Out of stock</div>
                <p className="text-xs text-stone-500 mt-1">
                  Reported {avail.observedAt.toLocaleDateString()} as out of stock,
                  with no price recorded.
                </p>
              </div>
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

      {pendingReports > 0 && (
        <p className="mt-3 text-xs text-stone-500">
          {pendingReports} community report{pendingReports === 1 ? "" : "s"}{" "}
          awaiting review or corroboration — displayed prices don’t change
          until reports are verified.{" "}
          <Link href="/how-it-works" className="text-teal-700 underline">
            How this works
          </Link>
        </p>
      )}

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
                <span className="text-xs text-stone-400"> · reported {d.observedAt.toLocaleDateString()}</span>{" "}
                <FlagDealButton storeId={store.id} dealId={d.id} signedIn={Boolean(user)} />
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
        {productLines.map((line) => (
          <PriceHistorySparkline
            key={line.id}
            lineName={line.name}
            points={store.observations
              .filter(
                (o) =>
                  o.productLineId === line.id &&
                  o.priceCents !== null &&
                  (o.status === "ACTIVE" || o.status === "SUPERSEDED")
              )
              .slice(0, 25)
              .map((o) => ({
                observedAt: o.observedAt,
                priceCents: o.priceCents!,
                sourceType: o.sourceType,
                status: o.status,
              }))}
          />
        ))}
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
                <th className="py-1.5 pr-2">Status</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {store.observations.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-stone-100 text-stone-700"
                  title={o.notes ?? undefined}
                >
                  <td className="py-1.5 pr-2">{o.observedAt.toLocaleDateString()}</td>
                  <td className="py-1.5 pr-2">
                    {o.productLine.name}
                    {(o.strength || o.flavor || o.canSize) && (
                      <span className="block text-[11px] text-stone-400">
                        {[o.strength, o.flavor, o.canSize].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 font-medium">
                    {o.priceCents !== null ? (
                      formatCents(o.priceCents)
                    ) : (
                      <span className="font-normal text-stone-500">
                        {o.availability === "NOT_CARRIED"
                          ? "not carried"
                          : o.availability === "OUT_OF_STOCK"
                            ? "out of stock"
                            : "no price"}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-stone-500">{o.sourceType.toLowerCase()}</td>
                  <td className="py-1.5 pr-2 text-xs text-stone-400">{o.status.toLowerCase()}</td>
                  <td className="py-1.5 text-right">
                    <FlagObservationButton
                      storeId={store.id}
                      observationId={o.id}
                      signedIn={Boolean(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Nearby alternatives */}
      {nearby.length > 0 && (
        <div className="mt-8">
          <h2 className="font-medium text-stone-900">Other stores within 2 miles</h2>
          <ul className="mt-2 space-y-2">
            {nearby.map((n) => {
              const price = n.latest?.priceCents ?? null;
              const cheaper =
                price !== null && thisZynPrice !== null && price < thisZynPrice;
              return (
                <li key={n.id}>
                  <Link
                    href={`/stores/${n.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:border-teal-400"
                  >
                    <span className="min-w-0 truncate text-stone-800">
                      {n.name}
                      <span className="ml-1.5 text-xs text-stone-400">
                        {n.distanceMiles} mi
                      </span>
                    </span>
                    <span className="shrink-0">
                      {price !== null ? (
                        <>
                          <span className="font-medium text-stone-900">
                            {formatCents(price)}
                          </span>
                          {cheaper && (
                            <span className="ml-1.5 text-xs text-teal-700">cheaper</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">no price yet</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Comments */}
      <Comments
        storeId={store.id}
        comments={store.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          editedAt: c.editedAt?.toISOString() ?? null,
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
