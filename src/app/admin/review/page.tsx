import { prisma } from "@/lib/db";
import { ReviewActions } from "./ReviewActions";
import { formatCents } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue — NicFinder admin" };

export default async function ReviewPage() {
  const [pending, corroborating, flaggedComments, observationFlags] = await Promise.all([
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
    prisma.contribution.findMany({
      where: { status: "PENDING", kind: "FLAG_OBSERVATION" },
      include: {
        user: { select: { id: true, displayName: true, reputation: true } },
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  // Load the flagged observations for context (price, date, source).
  const flaggedObsIds = observationFlags
    .map((f) => f.targetObservationId)
    .filter((x): x is string => Boolean(x));
  const flaggedObs = flaggedObsIds.length
    ? await prisma.priceObservation.findMany({
        where: { id: { in: flaggedObsIds } },
        include: { productLine: { select: { name: true } } },
      })
    : [];
  const obsById = new Map(flaggedObs.map((o) => [o.id, o]));

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
          Flagged observations ({observationFlags.length})
        </h2>
        <p className="text-sm text-stone-500">
          Members reporting that a specific listed observation (current or
          historical) is wrong. Upholding invalidates the observation
          (append-only — the row stays, marked invalid, with the reason).
        </p>
        <ul className="mt-3 space-y-2">
          {observationFlags.length === 0 && (
            <li className="text-sm text-stone-400">No observation flags.</li>
          )}
          {observationFlags.map((f) => {
            const obs = f.targetObservationId ? obsById.get(f.targetObservationId) : undefined;
            return (
              <li key={f.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p>
                      {obs ? (
                        <>
                          <strong>
                            {obs.priceCents !== null
                              ? formatCents(obs.priceCents)
                              : obs.availability.toLowerCase().replace(/_/g, " ")}
                          </strong>{" "}
                          ({obs.productLine.name}, observed{" "}
                          {obs.observedAt.toLocaleDateString()},{" "}
                          {obs.sourceType.toLowerCase()}, now {obs.status.toLowerCase()})
                        </>
                      ) : (
                        <em>observation missing</em>
                      )}{" "}
                      at{" "}
                      <Link href={`/stores/${f.store.id}`} className="text-teal-700 hover:underline">
                        {f.store.name}
                      </Link>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      flagged by{" "}
                      <Link href={`/users/${f.user.id}`} className="hover:underline">
                        {f.user.displayName}
                      </Link>{" "}
                      (rep {f.user.reputation}) · {f.createdAt.toLocaleString()}
                      {f.comment && <> · “{f.comment}”</>}
                    </p>
                  </div>
                  <ReviewActions flagId={f.id} />
                </div>
              </li>
            );
          })}
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
