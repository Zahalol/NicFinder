import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { NotificationsPanel } from "./NotificationsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { WatchlistCompare } from "./WatchlistCompare";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account — NicFinder" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getSettings();

  const [contributions, repEvents, savedStores, notifications] = await Promise.all([
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
      // Retired/merged stores drop off the watchlist view (their rows stay,
      // so restoring a store brings it back automatically).
      where: { userId: user.id, store: { status: "ACTIVE" } },
      include: {
        store: {
          include: {
            observations: {
              // priced only — a 'not carried' row must not stand in for a price
              where: { status: "ACTIVE", priceCents: { not: null } },
              orderBy: { observedAt: "desc" },
              take: 1,
              include: { productLine: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const sessionCount = await prisma.authSession.count({
    where: { userId: user.id, expiresAt: { gte: new Date() } },
  });

  const trusted = user.reputation >= settings.trustedReputation;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{user.displayName}</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">{user.email} · member since {user.createdAt.toLocaleDateString()}</p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
          <div className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{user.reputation}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">reputation</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
          <div className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{contributions.length}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400">recent contributions</div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
          <div className={`text-sm font-medium ${trusted ? "text-teal-700 dark:text-teal-400" : "text-stone-500 dark:text-stone-400"}`}>
            {trusted ? "Trusted contributor" : "Building trust"}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {trusted
              ? "Your in-range price reports publish immediately."
              : `Reach ${settings.trustedReputation} reputation for instant publishing.`}
          </div>
        </div>
      </div>

      <SettingsPanel
        displayName={user.displayName}
        hasPassword={Boolean(user.passwordHash)}
        sessionCount={sessionCount}
      />

      <NotificationsPanel
        items={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          url: n.url,
          read: n.readAt !== null,
          createdAt: n.createdAt.toISOString(),
        }))}
      />

      <h2 className="mt-8 font-medium text-stone-900 dark:text-stone-100">
        Your watchlist <span className="text-stone-400 font-normal">({savedStores.length})</span>
      </h2>
      {savedStores.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          No saved stores yet — tap <span className="text-stone-700 dark:text-stone-300">☆ Save</span> on any store page
          to track it here.
        </p>
      ) : (
        <WatchlistCompare
          items={savedStores.map((s) => {
            const latest = s.store.observations[0];
            return {
              storeId: s.store.id,
              name: s.store.name,
              address: s.store.address,
              priceLabel: latest ? formatCents(latest.priceCents) : null,
              priceMeta: latest
                ? `${latest.productLine.name} · ${latest.observedAt.toLocaleDateString()}`
                : null,
            };
          })}
        />
      )}

      <h2 className="mt-8 font-medium text-stone-900 dark:text-stone-100">Your contributions</h2>
      {contributions.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          None yet — find a <Link href="/search?q=60614" className="underline text-teal-700 dark:text-teal-400">store near you</Link> and confirm a price.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
          {contributions.map((c) => (
            <li key={c.id} className="p-3 text-sm flex items-center justify-between gap-2">
              <span>
                {c.kind === "CONFIRM"
                  ? "Confirmed price at"
                  : c.kind === "DISPUTE"
                    ? `Reported ${formatCents(c.proposedPriceCents)} at`
                    : c.kind === "REPORT_DEAL"
                      ? "Reported a deal at"
                      : c.kind === "FLAG_DEAL"
                        ? "Flagged a deal at"
                        : "Flagged an entry at"}{" "}
                <Link href={`/stores/${c.store.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">{c.store.name}</Link>
              </span>
              <span className={`text-xs rounded px-1.5 py-0.5 ${
                c.status === "PUBLISHED" ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                : c.status === "CORROBORATING" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                : c.status === "PENDING" ? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                : "bg-red-50 text-red-700 dark:text-red-400"
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
