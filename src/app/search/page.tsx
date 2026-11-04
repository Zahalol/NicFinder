import { geocode, nearestZip } from "@/lib/geocode";
import { searchStores, type SortKey } from "@/lib/search";
import { SearchBox } from "@/components/SearchBox";
import { SearchResults } from "@/components/SearchResults";
import { CoverageRequestButton } from "@/components/CoverageRequestButton";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/db";
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
  const product = params.product === "zyn-ultra" ? "zyn-ultra" : "zyn";
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

  const hasLocation = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const search = hasLocation
    ? await searchStores({ lat: lat!, lng: lng!, radiusMiles: radius, productSlug: product, qty, sort })
    : null;

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
        <p className="mt-8 text-center text-stone-500 text-sm">
          Enter a ZIP code or address to find nearby prices.
        </p>
      )}

      {geocodeFailed && (
        <div className="mt-8 max-w-xl mx-auto rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h2 className="font-medium text-stone-900">We couldn’t locate “{q}”</h2>
          <p className="mt-2 text-sm text-stone-600">
            Try a 5-digit ZIP code (ZIP search works even offline) or a fuller
            street address. Address lookup uses OpenStreetMap and may be
            briefly unavailable.
          </p>
        </div>
      )}

      {hasLocation && search && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-500">
              Near <span className="text-stone-800">{locationLabel ?? "selected point"}</span>
              {approximate && " (ZIP center)"} ·
            </span>
            {/* Product toggle */}
            <span className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              <Link href={href({ product: "zyn" })} className={`px-3 py-1 ${product === "zyn" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>ZYN</Link>
              <Link href={href({ product: "zyn-ultra" })} className={`px-3 py-1 ${product === "zyn-ultra" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>ZYN Ultra</Link>
            </span>
            {/* Quantity */}
            <label className="text-stone-500 ml-1">Buying</label>
            <span className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              {QTYS.map((n) => (
                <Link key={n} href={href({ qty: n })} className={`px-2.5 py-1 ${qty === n ? "bg-teal-600 text-white" : "bg-white text-stone-600"}`}>
                  {n}
                </Link>
              ))}
            </span>
            <span className="text-stone-500">can{qty > 1 ? "s" : ""}</span>
            {/* Radius */}
            <label className="text-stone-500 ml-1">within</label>
            <span className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              {RADII.map((r) => (
                <Link key={r} href={href({ radius: r })} className={`px-2.5 py-1 ${radius === r ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>
                  {r}mi
                </Link>
              ))}
            </span>
            {/* Sort */}
            <label className="text-stone-500 ml-1">sort</label>
            <span className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              {(["distance", "price", "recency"] as const).map((s) => (
                <Link key={s} href={href({ sort: s })} className={`px-2.5 py-1 capitalize ${sort === s ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>
                  {s}
                </Link>
              ))}
            </span>
          </div>

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
      className="mt-5 block rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-5 hover:border-teal-400 transition"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            Best price nearby{qty > 1 ? ` (buying ${qty})` : ""}
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            {best.name}
            {best.isDemo && (
              <span className="ml-2 align-middle rounded bg-amber-100 text-amber-800 text-[10px] font-medium px-1.5 py-0.5 uppercase">demo data</span>
            )}
          </p>
          <p className="text-sm text-stone-500">
            {best.address} · {best.distanceMiles} mi
            {best.effective.usedDeal && " · multi-can deal applied"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-teal-700">
            {formatCents(best.effective.perCanCents)}
            <span className="text-sm font-normal text-stone-500">/can</span>
          </div>
          {spread > 0 && priced.length > 1 && (
            <div className="text-xs text-stone-500">
              up to {formatCents(spread)} cheaper than nearby stores
            </div>
          )}
        </div>
      </div>
    </Link>
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

  return (
    <div className="mt-10 max-w-xl mx-auto rounded-xl border border-stone-200 bg-white p-6 text-center">
      <h2 className="font-medium text-stone-900">No coverage here yet</h2>
      <p className="mt-2 text-sm text-stone-600">
        We don’t track any stores within {radius} miles of this location. Our
        pilot area is Chicago, IL. We never guess or invent prices for stores
        we haven’t covered — try widening the radius or searching a Chicago
        ZIP like 60614.
      </p>
      <CoverageRequestButton zip={zip} lat={lat} lng={lng} initialCount={requestCount} />
    </div>
  );
}
