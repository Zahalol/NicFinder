import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — NicFinder" };

export default async function AdminOverview() {
  const settings = await getSettings();
  const staleCutoff = new Date(Date.now() - settings.staleAfterDays * 86400_000);

  const [
    storeCount,
    demoStores,
    pricedStores,
    staleStores,
    obsCount,
    pendingContribs,
    corroborating,
    reportedComments,
    openDuplicates,
    batches,
    users,
    recentAudit,
  ] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.store.count({ where: { status: "ACTIVE", isDemo: true } }),
    prisma.store.count({
      where: { status: "ACTIVE", observations: { some: { status: "ACTIVE" } } },
    }),
    prisma.store.count({
      where: {
        status: "ACTIVE",
        observations: { some: { status: "ACTIVE" } },
        NOT: { observations: { some: { status: "ACTIVE", observedAt: { gte: staleCutoff } } } },
      },
    }),
    prisma.priceObservation.count(),
    prisma.contribution.count({ where: { status: "PENDING" } }),
    prisma.contribution.count({ where: { status: "CORROBORATING" } }),
    prisma.comment.count({ where: { OR: [{ status: "HIDDEN" }, { reportCount: { gte: 1 } }], NOT: { status: "DELETED" } } }),
    prisma.duplicateCandidate.count({ where: { status: "OPEN" } }),
    prisma.importBatch.count(),
    prisma.user.count(),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const cards = [
    { label: "Active stores", value: storeCount, hint: `${demoStores} demo fixtures` },
    { label: "Stores with prices", value: pricedStores, hint: `${storeCount - pricedStores} without` },
    { label: "Stale-priced stores", value: staleStores, hint: `> ${settings.staleAfterDays}d old` },
    { label: "Price observations", value: obsCount, hint: "append-only" },
    { label: "Pending review", value: pendingContribs, hint: "disputes, flags & deal reports", href: "/admin/review" },
    { label: "Awaiting corroboration", value: corroborating, hint: "community proposals", href: "/admin/review" },
    { label: "Flagged comments", value: reportedComments, hint: "reported or auto-hidden", href: "/admin/review" },
    { label: "Possible duplicates", value: openDuplicates, hint: "store identities", href: "/admin/stores" },
    { label: "Import batches", value: batches, hint: "", href: "/admin/imports" },
    { label: "Users", value: users, hint: "" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => {
          const inner = (
            <div className="rounded-xl border border-stone-200 bg-white p-4 h-full hover:border-teal-300">
              <div className="text-2xl font-semibold text-stone-900">{c.value}</div>
              <div className="text-xs text-stone-500">{c.label}</div>
              {c.hint && <div className="text-[11px] text-stone-400 mt-0.5">{c.hint}</div>}
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href}>{inner}</Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      <h2 className="mt-8 font-medium text-stone-900">Recent audit log</h2>
      <ul className="mt-2 text-sm text-stone-600 space-y-1">
        {recentAudit.length === 0 && <li className="text-stone-400">No events yet.</li>}
        {recentAudit.map((e) => (
          <li key={e.id} className="flex gap-2">
            <span className="text-stone-400 text-xs w-36 shrink-0">
              {e.createdAt.toLocaleString()}
            </span>
            <span>
              {e.action} {e.targetType ? `· ${e.targetType} ${e.targetId?.slice(0, 8)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
