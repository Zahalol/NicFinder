import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";

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
              take: 1,
              include: { productLine: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const trusted = user.reputation >= settings.trustedReputation;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900">{user.displayName}</h1>
      <p className="text-sm text-stone-500">{user.email} · member since {user.createdAt.toLocaleDateString()}</p>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-2xl font-semibold text-stone-900">{user.reputation}</div>
          <div className="text-xs text-stone-500">reputation</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-2xl font-semibold text-stone-900">{contributions.length}</div>
          <div className="text-xs text-stone-500">recent contributions</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className={`text-sm font-medium ${trusted ? "text-teal-700" : "text-stone-500"}`}>
            {trusted ? "Trusted contributor" : "Building trust"}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {trusted
              ? "Your in-range price reports publish immediately."
              : `Reach ${settings.trustedReputation} reputation for instant publishing.`}
          </div>
        </div>
      </div>

      <h2 className="mt-8 font-medium text-stone-900">
        Your watchlist <span className="text-stone-400 font-normal">({savedStores.length})</span>
      </h2>
      {savedStores.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          No saved stores yet — tap <span className="text-stone-700">☆ Save</span> on any store page
          to track it here.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {savedStores.map((s) => {
            const latest = s.store.observations[0];
            return (
              <li key={s.id} className="p-3 text-sm flex items-center justify-between gap-2">
                <span>
                  <Link href={`/stores/${s.store.id}`} className="text-teal-700 hover:underline font-medium">
                    {s.store.name}
                  </Link>{" "}
                  <span className="text-stone-500">{s.store.address}</span>
                </span>
                <span className="text-stone-700 shrink-0">
                  {latest ? (
                    <>
                      {formatCents(latest.priceCents)}
                      <span className="text-xs text-stone-400"> · {latest.productLine.name} · {latest.observedAt.toLocaleDateString()}</span>
                    </>
                  ) : (
                    <span className="text-stone-400">no price yet</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 font-medium text-stone-900">Your contributions</h2>
      {contributions.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          None yet — find a <Link href="/search?q=60614" className="underline text-teal-700">store near you</Link> and confirm a price.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {contributions.map((c) => (
            <li key={c.id} className="p-3 text-sm flex items-center justify-between gap-2">
              <span>
                {c.kind === "CONFIRM" ? "Confirmed price at" : `Reported ${formatCents(c.proposedPriceCents)} at`}{" "}
                <Link href={`/stores/${c.store.id}`} className="text-teal-700 hover:underline">{c.store.name}</Link>
              </span>
              <span className={`text-xs rounded px-1.5 py-0.5 ${
                c.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700"
                : c.status === "CORROBORATING" ? "bg-amber-50 text-amber-700"
                : c.status === "PENDING" ? "bg-stone-100 text-stone-600"
                : "bg-red-50 text-red-700"
              }`}>
                {c.status.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-medium text-stone-900">Recent reputation changes</h2>
      <ul className="mt-2 text-sm text-stone-600 space-y-1">
        {repEvents.length === 0 && <li className="text-stone-400">No reputation events yet.</li>}
        {repEvents.map((e) => (
          <li key={e.id}>
            <span className={e.delta >= 0 ? "text-emerald-700" : "text-red-600"}>
              {e.delta >= 0 ? "+" : ""}{e.delta}
            </span>{" "}
            {e.reason.replace(/_/g, " ").toLowerCase()} · {e.createdAt.toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
