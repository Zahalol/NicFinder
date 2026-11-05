import { prisma } from "@/lib/db";
import { ReviewActions } from "./ReviewActions";
import { formatCents } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue — NicFinder admin" };

function describeDeal(json: string): string {
  try {
    const d = JSON.parse(json) as {
      minQty: number;
      pricePerCanCents: number | null;
      discountPerCanCents: number | null;
    };
    return d.pricePerCanCents !== null
      ? `Deal: buy ${d.minQty}+ at ${formatCents(d.pricePerCanCents)}/can`
      : `Deal: buy ${d.minQty}+, ${formatCents(d.discountPerCanCents)} off each`;
  } catch {
    return "Deal report (unparseable)";
  }
}

export default async function ReviewPage() {
  const [pending, corroborating, flaggedComments, observationFlags] = await Promise.all([
    prisma.contribution.findMany({
      where: { status: "PENDING", kind: { in: ["DISPUTE", "REPORT_DEAL"] } },
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
      where: { status: "PENDING", kind: { in: ["FLAG_OBSERVATION", "FLAG_DEAL"] } },
      include: {
        user: { select: { id: true, displayName: true, reputation: true } },
        store: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  // Load the flagged observations for context (price, date, source).
  const dealFlags = observationFlags.filter((f) => f.kind === "FLAG_DEAL");
  const obsFlags = observationFlags.filter((f) => f.kind === "FLAG_OBSERVATION");
  const flaggedDealIds = dealFlags
    .map((f) => f.targetObservationId)
    .filter((x): x is string => Boolean(x));
  const flaggedDeals = flaggedDealIds.length
    ? await prisma.quantityDeal.findMany({
        where: { id: { in: flaggedDealIds } },
        include: { productLine: { select: { name: true } } },
      })
    : [];
  const dealById = new Map(flaggedDeals.map((d) => [d.id, d]));
  const flaggedObsIds = obsFlags
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
      <li className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p>
              {c.kind === "REPORT_DEAL" && c.proposedDealJson ? (
                <strong>{describeDeal(c.proposedDealJson)}</strong>
              ) : (
                <strong>{formatCents(c.proposedPriceCents)}</strong>
              )}{" "}
              proposed at{" "}
              <Link href={`/stores/${c.store.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">
                {c.store.name}
              </Link>{" "}
              <span className="text-stone-500 dark:text-stone-400">({c.store.address})</span>
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
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
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Needs moderator decision ({pending.length})
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Guardrail-tripping price changes and community deal reports.
        </p>
        <ul className="mt-3 space-y-2">
          {pending.length === 0 && <li className="text-sm text-stone-400">Queue is empty.</li>}
          {pending.map((c) => <ContributionRow key={c.id} c={c} />)}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Awaiting community corroboration ({corroborating.length})
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          These publish automatically once enough independent members agree — or you can decide now.
        </p>
        <ul className="mt-3 space-y-2">
          {corroborating.length === 0 && <li className="text-sm text-stone-400">None waiting.</li>}
          {corroborating.map((c) => <ContributionRow key={c.id} c={c} />)}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Flagged observations ({obsFlags.length})
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Members reporting that a specific listed observation (current or
          historical) is wrong. Upholding invalidates the observation
          (append-only — the row stays, marked invalid, with the reason).
        </p>
        <ul className="mt-3 space-y-2">
          {obsFlags.length === 0 && (
            <li className="text-sm text-stone-400">No observation flags.</li>
          )}
          {obsFlags.map((f) => {
            const obs = f.targetObservationId ? obsById.get(f.targetObservationId) : undefined;
            return (
              <li key={f.id} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-sm">
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
                      <Link href={`/stores/${f.store.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">
                        {f.store.name}
                      </Link>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
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
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Flagged deals ({dealFlags.length})
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Members reporting a listed deal as ended or wrong. “Ended” keeps it in
          history as EXPIRED; “Invalid” marks it bad data.
        </p>
        <ul className="mt-3 space-y-2">
          {dealFlags.length === 0 && <li className="text-sm text-stone-400">No deal flags.</li>}
          {dealFlags.map((f) => {
            const deal = f.targetObservationId ? dealById.get(f.targetObservationId) : undefined;
            return (
              <li key={f.id} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p>
                      {deal ? (
                        <strong>
                          {deal.productLine.name}: buy {deal.minQty}+{" "}
                          {deal.pricePerCanCents !== null
                            ? `at ${formatCents(deal.pricePerCanCents)}/can`
                            : `${formatCents(deal.discountPerCanCents)} off each`}
                        </strong>
                      ) : (
                        <em>deal missing</em>
                      )}{" "}
                      at{" "}
                      <Link href={`/stores/${f.store.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">
                        {f.store.name}
                      </Link>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      flagged by{" "}
                      <Link href={`/users/${f.user.id}`} className="hover:underline">
                        {f.user.displayName}
                      </Link>{" "}
                      (rep {f.user.reputation}) · {f.createdAt.toLocaleString()}
                      {f.comment && <> · “{f.comment}”</>}
                    </p>
                  </div>
                  <ReviewActions dealFlagId={f.id} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Flagged comments ({flaggedComments.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {flaggedComments.length === 0 && <li className="text-sm text-stone-400">Nothing flagged.</li>}
          {flaggedComments.map((cm) => (
            <li key={cm.id} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-stone-700 dark:text-stone-300">“{cm.body}”</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {cm.user.displayName} on{" "}
                    <Link href={`/stores/${cm.store.id}`} className="hover:underline text-teal-700 dark:text-teal-400">
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
