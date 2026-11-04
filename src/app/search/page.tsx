import { geocode, nearestZip } from "@/lib/geocode";
import { searchStores, type SortKey } from "@/lib/search";
import { SearchBox } from "@/components/SearchBox";
import { SearchResults } from "@/components/SearchResults";
import { CoverageRequestButton } from "@/components/CoverageRequestButton";
import { QuickSearches } from "@/components/QuickSearches";
import { formatCents } from "@/lib/money";
import { compareTrip } from "@/lib/trip";
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
        <div className="mt-8 text-center">
          <p className="text-stone-500 text-sm">
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
          <p className="mt-4 text-sm text-stone-500">
            Near <span className="text-stone-800 font-medium">{locationLabel ?? "selected point"}</span>
            {approximate && <span className="text-stone-400"> (ZIP center)</span>}
          </p>

          {/* Filter bar: labeled control groups, horizontally scrollable on mobile */}
          <div
            className="mt-3 flex items-end gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Search filters"
          >
            <FilterGroup label="Product">
              <FilterPill href={href({ product: "zyn" })} active={product === "zyn"}>ZYN</FilterPill>
              <FilterPill href={href({ product: "zyn-ultra" })} active={product === "zyn-ultra"}>Ultra</FilterPill>
            </FilterGroup>
            <FilterGroup label="Cans">
              {QTYS.map((n) => (
                <FilterPill key={n} href={href({ qty: n })} active={qty === n} accent>
                  {n}
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label="Within">
              {RADII.map((r) => (
                <FilterPill key={r} href={href({ radius: r })} active={radius === r}>
                  {r} mi
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label="Sort by">
              {(
                [
                  ["distance", "Nearest"],
                  ["price", "Cheapest"],
                  ["recency", "Newest"],
                ] as const
              ).map(([s, label]) => (
                <FilterPill key={s} href={href({ sort: s })} active={sort === s}>
                  {label}
                </FilterPill>
              ))}
            </FilterGroup>
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

/** A labeled group of filter pills. */
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="shrink-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400 mb-1">
        {label}
      </p>
      <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  accent = false,
  children,
}: {
  href: string;
  active: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
        active
          ? accent
            ? "bg-teal-600 text-white"
            : "bg-stone-900 text-white"
          : "bg-white text-stone-600 hover:bg-stone-50"
      }`}
    >
      {children}
    </Link>
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

  // "Worth the trip?" — only when a *different*, closer store also has a
  // price and skipping it for the best price means extra driving.
  const nearest = [...priced].sort((a, b) => a.distanceMiles - b.distanceMiles)[0];
  const trip =
    nearest.id !== best.id
      ? compareTrip({
          bestPerCanCents: best.effective.perCanCents!,
          bestDistanceMiles: best.distanceMiles,
          altPerCanCents: nearest.effective.perCanCents!,
          altDistanceMiles: nearest.distanceMiles,
          qty,
        })
      : null;

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

      {trip && (
        <div className="mt-3 border-t border-teal-200/60 pt-2.5 text-xs text-stone-600 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-medium text-stone-700">Worth the trip?</span>
          <span>
            vs {nearest.name} ({nearest.distanceMiles} mi): save{" "}
            <strong className="text-stone-800">{formatCents(trip.savingsCents)}</strong>
            {qty > 1 ? ` on ${qty} cans` : ""} for +{trip.extraRoundTripMiles} mi round trip
            (≈{formatCents(trip.drivingCostCents)} driving
            <span className="text-stone-400">*</span>)
            {" — "}
            {trip.netCents > 0 ? (
              <strong className="text-teal-700">worth the detour</strong>
            ) : (
              <strong className="text-amber-700">the closer store may win</strong>
            )}
          </span>
          <span className="w-full text-[10px] text-stone-400">
            *estimated at the IRS standard mileage rate (70¢/mi, fuel + wear)
          </span>
        </div>
      )}
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
