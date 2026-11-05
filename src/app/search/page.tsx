import { geocode, nearestZip } from "@/lib/geocode";
import { suggestZips } from "@/lib/zip-suggest";
import { haversineMiles } from "@/lib/geo";
import { QuickSearches } from "@/components/QuickSearches";
import { searchStores, type SortKey } from "@/lib/search";
import { SearchBox } from "@/components/SearchBox";
import { SearchResults } from "@/components/SearchResults";
import { CoverageRequestButton } from "@/components/CoverageRequestButton";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Search — NicFinder" };
export const dynamic = "force-dynamic";

const RADII = [1, 2, 5, 10, 25];
const QTYS = [1, 3, 5, 10];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  // Product lines come from the DB (the engine is brand-agnostic); the
  // first active line is the default.
  const productLines = await prisma.productLine.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
  const product = productLines.some((l) => l.slug === params.product)
    ? params.product!
    : (productLines[0]?.slug ?? "zyn");
  const qty = QTYS.includes(Number(params.qty)) ? Number(params.qty) : 1;
  const radius = RADII.includes(Number(params.radius)) ? Number(params.radius) : 5;
  const sort: SortKey = ["distance", "price", "recency"].includes(params.sort ?? "")
    ? (params.sort as SortKey)
    : "distance";

  // URL-supplied coordinates must be real Earth coordinates; anything else
  // (NaN, Infinity, out-of-range junk) is treated as "no location given".
  const inRange = (v: number | null, limit: number) =>
    v !== null && Number.isFinite(v) && Math.abs(v) <= limit;
  let lat = params.lat ? Number(params.lat) : null;
  let lng = params.lng ? Number(params.lng) : null;
  if (!inRange(lat, 90) || !inRange(lng, 180)) {
    lat = null;
    lng = null;
  }
  let locationLabel: string | null = lat !== null ? "your location" : null;
  let approximate = false;
  let geocodeFailed = false;

  if ((lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) && q) {
    const geo = await geocode(q);
    if (geo) {
      lat = geo.latitude;
      lng = geo.longitude;
      locationLabel = geo.label;
      approximate = geo.approximate;
    } else {
      geocodeFailed = true;
      lat = null;
      lng = null;
    }
  }

  // Store-name / street matches ("Looking for a specific store?") — only
  // when the query isn't a plain ZIP.
  const wordish = q && !/^\d{5}(-\d{4})?$/.test(q);
  const nameMatches = wordish
    ? await prisma.store
        .findMany({
          where: {
            status: "ACTIVE",
            OR: q
              .split(/\s+/)
              .filter((w) => w.length >= 3)
              .slice(0, 4)
              .map((w) => ({
                OR: [
                  { name: { contains: w, mode: "insensitive" as const } },
                  { address: { contains: w, mode: "insensitive" as const } },
                ],
              })),
          },
          select: { id: true, name: true, address: true, city: true, zip: true, isDemo: true },
          take: 5,
        })
        .catch(() => [])
    : [];

  const hasLocation = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const [search, user] = await Promise.all([
    hasLocation
      ? searchStores({ lat: lat!, lng: lng!, radiusMiles: radius, productSlug: product, qty, sort })
      : Promise.resolve(null),
    getCurrentUser().catch(() => null),
  ]);
  const savedIds = user
    ? (
        await prisma.savedStore.findMany({
          where: { userId: user.id },
          select: { storeId: true },
        })
      ).map((s) => s.storeId)
    : [];

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (!q && hasLocation) {
    baseParams.set("lat", String(lat));
    baseParams.set("lng", String(lng));
  }

  function href(overrides: Record<string, string | number>) {
    const p = new URLSearchParams(baseParams);
    p.set("product", product);
    p.set("qty", String(qty));
    p.set("radius", String(radius));
    p.set("sort", sort);
    for (const [k, v] of Object.entries(overrides)) p.set(k, String(v));
    return `/search?${p.toString()}`;
  }

  return (
    <div className="py-6">
      <SearchBox initialQuery={q} />

      {!q && !hasLocation && (
        <div className="mt-8 text-center">
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Enter a ZIP code or address to find nearby prices.
          </p>
          <QuickSearches
            popular={[
              { q: "60614", label: "Lincoln Park 60614" },
              { q: "60657", label: "Lakeview 60657" },
              { q: "60622", label: "Wicker Park 60622" },
            ]}
          />
        </div>
      )}

      {geocodeFailed && (
        <div className="mt-8 max-w-xl mx-auto rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 text-center">
          <h2 className="font-medium text-stone-900 dark:text-stone-100">We couldn’t locate “{q}”</h2>
          <ZipSuggestions q={q} />
          <NameMatchList q={q} matches={nameMatches} />
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Try a 5-digit ZIP code (ZIP search works even offline) or a fuller
            street address. Address lookup uses OpenStreetMap and may be
            briefly unavailable.
          </p>
        </div>
      )}

      {hasLocation && search && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-500 dark:text-stone-400">
              Near <span className="text-stone-800 dark:text-stone-200">{locationLabel ?? "selected point"}</span>
              {approximate && " (ZIP center)"} ·
            </span>
            {/* Product toggle — rendered from active product lines */}
            <span className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden">
              {productLines.map((l) => (
                <Link
                  key={l.slug}
                  href={href({ product: l.slug })}
                  aria-current={product === l.slug ? "true" : undefined}
                  className={`px-3 py-1 whitespace-nowrap ${product === l.slug ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}
                >
                  {l.name.replace(" (regular)", "")}
                </Link>
              ))}
            </span>
            {/* Quantity */}
            <label className="text-stone-500 dark:text-stone-400 ml-1">Buying</label>
            <span className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden">
              {QTYS.map((n) => (
                <Link key={n} href={href({ qty: n })} aria-current={qty === n ? "true" : undefined} className={`px-2.5 py-1 ${qty === n ? "bg-teal-600 text-white" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}>
                  {n}
                </Link>
              ))}
            </span>
            <span className="text-stone-500 dark:text-stone-400">can{qty > 1 ? "s" : ""}</span>
            {/* Radius */}
            <label className="text-stone-500 dark:text-stone-400 ml-1">within</label>
            <span className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden">
              {RADII.map((r) => (
                <Link key={r} href={href({ radius: r })} aria-current={radius === r ? "true" : undefined} className={`px-2.5 py-1 ${radius === r ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}>
                  {r}mi
                </Link>
              ))}
            </span>
            {/* Sort */}
            <label className="text-stone-500 dark:text-stone-400 ml-1">sort</label>
            <span className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden">
              {(["distance", "price", "recency"] as const).map((s) => (
                <Link key={s} href={href({ sort: s })} aria-current={sort === s ? "true" : undefined} className={`px-2.5 py-1 capitalize ${sort === s ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}>
                  {s}
                </Link>
              ))}
            </span>
          </div>

          {nameMatches.length > 0 && (
            <div className="mt-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/40 px-4 py-3 text-sm">
              <p className="text-stone-600 dark:text-stone-400">
                Looking for a specific store? These match “{q}”:
              </p>
              <p className="mt-1.5 flex flex-wrap gap-2">
                {nameMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/stores/${m.id}`}
                    className="rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-teal-700 dark:text-teal-400 hover:border-teal-400"
                  >
                    {m.name}
                    <span className="text-stone-400 text-xs"> · {m.address}</span>
                  </Link>
                ))}
              </p>
            </div>
          )}

          {search.results.length === 0 ? (
            <NoCoverage q={q} lat={lat!} lng={lng!} radius={radius} />
          ) : (
            <>
              <BestPriceCard results={search.results} qty={qty} product={product} />
              <SearchResults
                results={search.results}
                center={{ lat: lat!, lng: lng! }}
                qty={qty}
                productSlug={product}
                initialPricedOnly={params.priced === "1"}
                signedIn={Boolean(user)}
                initialSavedIds={savedIds}
                productLineId={search.productLineId}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Hero summary: the best deal nearby — the thing the visitor came for. */
function BestPriceCard({
  results,
  qty,
  product,
}: {
  results: Awaited<ReturnType<typeof searchStores>>["results"];
  qty: number;
  product: string;
}) {
  const priced = results.filter((r) => r.effective.perCanCents !== null);
  if (priced.length === 0) return null;
  const best = [...priced].sort(
    (a, b) => a.effective.perCanCents! - b.effective.perCanCents!
  )[0];
  const prices = priced.map((r) => r.effective.perCanCents!);
  const max = Math.max(...prices);
  const spread = max - best.effective.perCanCents!;

  return (
    <Link
      href={`/stores/${best.id}?product=${product}`}
      className="mt-5 block rounded-2xl border border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 dark:from-teal-950 to-emerald-50 dark:to-emerald-950 p-5 hover:border-teal-400 transition"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
            Best price nearby{qty > 1 ? ` (buying ${qty})` : ""}
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
            {best.name}
            {best.isDemo && (
              <span className="ml-2 align-middle rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-[10px] font-medium px-1.5 py-0.5 uppercase">demo data</span>
            )}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {best.address} · {best.distanceMiles} mi
            {best.effective.usedDeal && " · multi-can deal applied"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-teal-700 dark:text-teal-400">
            {formatCents(best.effective.perCanCents)}
            <span className="text-sm font-normal text-stone-500 dark:text-stone-400">/can</span>
          </div>
          {spread > 0 && priced.length > 1 && (
            <div className="text-xs text-stone-500 dark:text-stone-400">
              up to {formatCents(spread)} cheaper than nearby stores
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/** "Did you mean" chips for a ZIP-like query that didn't resolve. */
function ZipSuggestions({ q }: { q: string }) {
  const suggestions = suggestZips(q);
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-sm text-stone-600 dark:text-stone-400">Did you mean:</p>
      <p className="mt-2 flex flex-wrap justify-center gap-2">
        {suggestions.map((sgn) => (
          <Link
            key={sgn.zip}
            href={`/search?q=${sgn.zip}`}
            className="rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm text-teal-700 dark:text-teal-400 hover:border-teal-400"
          >
            {sgn.zip} <span className="text-stone-500 dark:text-stone-400">({sgn.city}, {sgn.state})</span>
          </Link>
        ))}
      </p>
    </div>
  );
}

type NameMatch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  isDemo: boolean;
};

/** Stores whose name/street matches a query we couldn't geocode. */
function NameMatchList({ q, matches }: { q: string; matches: NameMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <div className="mt-4 text-left">
      <p className="text-sm text-stone-600 dark:text-stone-400 text-center">
        Stores matching “{q}”:
      </p>
      <ul className="mt-2 space-y-1.5">
        {matches.map((m) => (
          <li key={m.id}>
            <Link
              href={`/stores/${m.id}`}
              className="block rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-2 text-sm hover:border-teal-400 transition"
            >
              <span className="font-medium text-stone-800 dark:text-stone-200">{m.name}</span>
              {m.isDemo && (
                <span className="ml-1.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-[9px] font-medium px-1 py-0.5 uppercase align-middle">
                  demo
                </span>
              )}
              <span className="block text-xs text-stone-500 dark:text-stone-400">
                {m.address}
                {m.city ? `, ${m.city}` : ""} {m.zip ?? ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Honest empty state + demand capture. */
async function NoCoverage({
  q,
  lat,
  lng,
  radius,
}: {
  q: string;
  lat: number;
  lng: number;
  radius: number;
}) {
  const zipFromQuery = q.match(/^(\d{5})(-\d{4})?$/)?.[1] ?? null;
  const zip = zipFromQuery ?? nearestZip(lat, lng)?.zip ?? null;
  const requestCount = zip
    ? await prisma.coverageRequest.count({ where: { zip } })
    : 0;

  // Nearest covered area, suggested only when it's realistically reachable
  // (an honest "the pilot is 20 mi east", never "drive 1,700 mi"). Covered
  // means an active PRICE — a "not carried" row alone isn't coverage.
  const NEARBY_SUGGEST_MILES = 100;
  const covered = await prisma.store.findMany({
    where: {
      status: "ACTIVE",
      latitude: { not: null },
      longitude: { not: null },
      observations: { some: { status: "ACTIVE", priceCents: { not: null } } },
    },
    select: { city: true, state: true, zip: true, latitude: true, longitude: true },
    take: 500,
  });
  let nearestCovered: { label: string; zip: string; miles: number } | null = null;
  for (const st of covered) {
    const d = haversineMiles(lat, lng, st.latitude!, st.longitude!);
    if (d <= NEARBY_SUGGEST_MILES && st.zip && (!nearestCovered || d < nearestCovered.miles)) {
      nearestCovered = {
        label: [st.city, st.state].filter(Boolean).join(", "),
        zip: st.zip,
        miles: Math.round(d),
      };
    }
  }

  return (
    <div className="mt-10 max-w-xl mx-auto rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 text-center">
      <h2 className="font-medium text-stone-900 dark:text-stone-100">No coverage here yet</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        We don’t track any stores within {radius} miles of this location. Our
        pilot area is Chicago, IL. We never guess or invent prices for stores
        we haven’t covered — try widening the radius or searching a Chicago
        ZIP like 60614.
      </p>
      {nearestCovered && (
        <p className="mt-3 text-sm">
          <Link
            href={`/search?q=${nearestCovered.zip}`}
            className="text-teal-700 dark:text-teal-400 underline"
          >
            Nearest covered area: {nearestCovered.label} {nearestCovered.zip}
          </Link>{" "}
          <span className="text-stone-500 dark:text-stone-400">(~{nearestCovered.miles} mi from here)</span>
        </p>
      )}
      <CoverageRequestButton zip={zip} lat={lat} lng={lng} initialCount={requestCount} />
    </div>
  );
}
