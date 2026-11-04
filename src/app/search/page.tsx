import { geocode } from "@/lib/geocode";
import { searchStores, type SortKey } from "@/lib/search";
import { SearchBox } from "@/components/SearchBox";
import { SearchResults } from "@/components/SearchResults";
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

  let lat = params.lat ? Number(params.lat) : null;
  let lng = params.lng ? Number(params.lng) : null;
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
            <div className="mt-10 max-w-xl mx-auto rounded-xl border border-stone-200 bg-white p-6 text-center">
              <h2 className="font-medium text-stone-900">No coverage here yet</h2>
              <p className="mt-2 text-sm text-stone-600">
                We don’t track any stores within {radius} miles of this
                location. Our pilot area is Chicago, IL. We never guess or
                invent prices for stores we haven’t covered — try widening the
                radius or searching a Chicago ZIP like 60614.
              </p>
            </div>
          ) : (
            <SearchResults
              results={search.results}
              center={{ lat: lat!, lng: lng! }}
              qty={qty}
              productSlug={product}
            />
          )}
        </>
      )}
    </div>
  );
}
