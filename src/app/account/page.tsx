import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { ConfidenceBadge } from "@/components/badges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account — NicFinder" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getSettings();

  const [contributions, repEvents, savedStores] = await Promise.all([
    prisma.contribution.findMany({
      where: { userId: user.id },
      include: { store: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.reputationEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.savedStore.findMany({
      where: { userId: user.id },
      include: {
        store: {
          include: {
            observations: {
              where: { status: "ACTIVE" },
              orderBy: { observedAt: "desc" },
              take: 10,
              include: { productLine: true, verifications: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // Watchlist prices follow the same display policy as the rest of the site
  // (selectLatestPrice), computed on the ZYN-regular line for comparability.
  const watchRows = savedStores.map((s) => {
    const zynObs = s.store.observations.filter((o) => o.productLine.slug === "zyn");
    const latest = selectLatestPrice(zynObs, settings);
    return { saved: s, store: s.store, latest };
  });
  const pricedRows = watchRows.filter((r) => r.latest);
  const cheapestId =
    pricedRows.length >= 2
      ? pricedRows.reduce((a, b) =>
          a.latest!.observation.priceCents <= b.latest!.observation.priceCents ? a : b
        ).store.id
      : null;

  const trusted = user.reputation >= settings.trustedReputation;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{user.displayName}</h1>
      <p className="text-sm text-stone-500">{user.email} · member since {user.createdAt.toLocaleDateString()}</p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <div className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{user.reputation}</div>
          <div className="text-xs text-stone-500">reputation</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <div className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{contributions.length}</div>
          <div className="text-xs text-stone-500">recent contributions</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <div className={`text-sm font-medium ${trusted ? "text-teal-700 dark:text-teal-400" : "text-stone-500"}`}>
            {trusted ? "Trusted contributor" : "Building trust"}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {trusted
              ? "Your in-range price reports publish immediately."
              : `Reach ${settings.trustedReputation} reputation for instant publishing.`}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-medium text-stone-900 dark:text-stone-100">
        Your watchlist <span className="text-stone-400 font-normal">({savedStores.length})</span>
      </h2>
      {savedStores.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          No saved stores yet — tap <span className="text-stone-700 dark:text-stone-300">☆ Save</span> on any store page
          to track it here.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {watchRows.map(({ saved, store, latest }) => {
            const cheapest = store.id === cheapestId;
            return (
              <li key={saved.id}>
                <Link
                  href={`/stores/${store.id}`}
                  className={`block rounded-xl border bg-white dark:bg-stone-900 p-3.5 hover:border-teal-400 hover:shadow-sm transition ${
                    cheapest ? "border-teal-400 ring-1 ring-teal-400" : "border-stone-200 dark:border-stone-800"
                  }`}
                >
                  {cheapest && (
                    <p className="text-[10px] font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-1">
                      Cheapest on your watchlist
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                        {store.name}
                        {store.isDemo && (
                          <span className="ml-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-medium px-1 py-0.5 uppercase align-middle">
                            demo
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500 truncate">{store.address}</p>
                      {latest && (
                        <div className="mt-1.5 text-[11px]">
                          <ConfidenceBadge
                            input={{
                              sourceType: latest.observation.sourceType,
                              ageDays: latest.ageDays,
                              confirmCount: latest.confirmCount,
                              disputeCount: latest.disputeCount,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {latest ? (
                        <>
                          <div className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                            {formatCents(latest.observation.priceCents)}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            ZYN ·{" "}
                            {latest.ageDays === 0
                              ? "updated today"
                              : `${latest.ageDays}d ago`}
                            {latest.freshness === "stale" && (
                              <span className="text-amber-600 dark:text-amber-400"> · may be outdated</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-stone-400">no recent ZYN price</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 font-medium text-stone-900 dark:text-stone-100">Your contributions</h2>
      {contributions.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          None yet — find a <Link href="/search?q=60614" className="underline text-teal-700 dark:text-teal-400">store near you</Link> and confirm a price.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          {contributions.map((c) => (
            <li key={c.id} className="p-3 text-sm flex items-center justify-between gap-2">
              <span>
                {c.kind === "CONFIRM" ? "Confirmed price at" : `Reported ${formatCents(c.proposedPriceCents)} at`}{" "}
                <Link href={`/stores/${c.store.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">{c.store.name}</Link>
              </span>
              <span className={`text-xs rounded px-1.5 py-0.5 ${
                c.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : c.status === "CORROBORATING" ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                : c.status === "PENDING" ? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              }`}>
                {c.status.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-medium text-stone-900 dark:text-stone-100">Recent reputation changes</h2>
      <ul className="mt-2 text-sm text-stone-600 dark:text-stone-400 space-y-1">
        {repEvents.length === 0 && <li className="text-stone-400">No reputation events yet.</li>}
        {repEvents.map((e) => (
          <li key={e.id}>
            <span className={e.delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
              {e.delta >= 0 ? "+" : ""}{e.delta}
            </span>{" "}
            {e.reason.replace(/_/g, " ").toLowerCase()} · {e.createdAt.toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
