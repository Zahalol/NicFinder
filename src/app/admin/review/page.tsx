import { prisma } from "@/lib/db";
import { ReviewActions } from "./ReviewActions";
import { formatCents } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue — NicFinder admin" };

export default async function ReviewPage() {
  const [pending, corroborating, flaggedComments] = await Promise.all([
    prisma.contribution.findMany({
      where: { status: "PENDING", kind: "DISPUTE" },
      include: {
        user: { select: { id: true, displayName: true, reputation: true } },
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.contribution.findMany({
      where: { status: "CORROBORATING" },
      include: {
        user: { select: { id: true, displayName: true, reputation: true } },
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.comment.findMany({
      where: { OR: [{ status: "HIDDEN" }, { reportCount: { gte: 1 } }], NOT: { status: "DELETED" } },
      include: {
        user: { select: { id: true, displayName: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  function ContributionRow({
    c,
  }: {
    c: (typeof pending)[number];
  }) {
    return (
      <li className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p>
              <strong>{formatCents(c.proposedPriceCents)}</strong> proposed at{" "}
              <Link href={`/stores/${c.store.id}`} className="text-teal-700 hover:underline">
                {c.store.name}
              </Link>{" "}
              <span className="text-stone-500">({c.store.address})</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              by{" "}
              <Link href={`/users/${c.user.id}`} className="hover:underline">
                {c.user.displayName}
              </Link>{" "}
              (rep {c.user.reputation}) · {c.createdAt.toLocaleString()}
              {c.comment && <> · “{c.comment}”</>}
            </p>
          </div>
          <ReviewActions contributionId={c.id} />
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-lg font-semibold text-stone-900">
          Needs moderator decision ({pending.length})
        </h1>
        <p className="text-sm text-stone-500">Guardrail-tripping price changes.</p>
        <ul className="mt-3 space-y-2">
          {pending.length === 0 && <li className="text-sm text-stone-400">Queue is empty.</li>}
          {pending.map((c) => <ContributionRow key={c.id} c={c} />)}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900">
          Awaiting community corroboration ({corroborating.length})
        </h2>
        <p className="text-sm text-stone-500">
          These publish automatically once enough independent members agree — or you can decide now.
        </p>
        <ul className="mt-3 space-y-2">
          {corroborating.length === 0 && <li className="text-sm text-stone-400">None waiting.</li>}
          {corroborating.map((c) => <ContributionRow key={c.id} c={c} />)}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900">
          Flagged comments ({flaggedComments.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {flaggedComments.length === 0 && <li className="text-sm text-stone-400">Nothing flagged.</li>}
          {flaggedComments.map((cm) => (
            <li key={cm.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-stone-700">“{cm.body}”</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {cm.user.displayName} on{" "}
                    <Link href={`/stores/${cm.store.id}`} className="hover:underline text-teal-700">
                      {cm.store.name}
                    </Link>{" "}
                    · {cm.reportCount} report{cm.reportCount === 1 ? "" : "s"} · currently{" "}
                    {cm.status.toLowerCase()}
                  </p>
                </div>
                <ReviewActions commentId={cm.id} commentStatus={cm.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
