import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contributor profile — NicFinder" };

// Public credibility page: enough to judge how much weight this person's
// reports deserve, without exposing anything private (no email, no exact
// activity times beyond dates).

const KIND_LABEL: Record<string, string> = {
  CONFIRM: "Confirmed a price at",
  DISPUTE: "Updated the price at",
  FLAG_OBSERVATION: "Flagged an incorrect entry at",
};

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        reputation: true,
        createdAt: true,
        status: true,
        contributions: {
          where: { status: "PUBLISHED" },
          include: { store: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: { select: { verifications: true } },
      },
    }),
    getSettings(),
  ]);
  if (!user || user.status !== "ACTIVE") notFound();

  const [published, pending, rejected] = await Promise.all([
    prisma.contribution.count({ where: { userId: id, status: "PUBLISHED" } }),
    prisma.contribution.count({
      where: { userId: id, status: { in: ["PENDING", "CORROBORATING"] } },
    }),
    prisma.contribution.count({ where: { userId: id, status: "REJECTED" } }),
  ]);
  const trusted = user.reputation >= settings.trustedReputation;
  const accuracy =
    published + rejected > 0
      ? Math.round((published / (published + rejected)) * 100)
      : null;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-stone-900">
        {user.displayName}
        {trusted && (
          <span
            className="rounded bg-teal-50 border border-teal-200 px-1.5 py-0.5 text-[11px] font-medium text-teal-700"
            title={`Reputation ${user.reputation} (threshold ${settings.trustedReputation}): in-guardrail price reports publish without waiting for corroboration.`}
          >
            trusted contributor
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Member since {user.createdAt.toLocaleDateString()}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Reputation", value: String(user.reputation) },
          { label: "Published reports", value: String(published) },
          { label: "Price confirmations", value: String(user._count.verifications) },
          {
            label: "Report accuracy",
            value: accuracy !== null ? `${accuracy}%` : "—",
          },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="text-2xl font-semibold text-stone-900">{t.value}</div>
            <div className="mt-0.5 text-xs text-stone-500">{t.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-stone-500">
        {pending > 0 && `${pending} report${pending === 1 ? "" : "s"} currently awaiting review. `}
        {accuracy !== null &&
          `Accuracy is published ÷ (published + not accepted) over all reviewed reports. `}
        Reputation rises when reports hold up and falls when they don’t —{" "}
        <Link href="/how-it-works" className="text-teal-700 underline">
          how verification works
        </Link>
        .
      </p>

      <h2 className="mt-6 font-medium text-stone-900">Recent published activity</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
        {user.contributions.length === 0 && (
          <li className="text-stone-400">No published contributions yet.</li>
        )}
        {user.contributions.map((c) => (
          <li key={c.id}>
            {KIND_LABEL[c.kind] ?? "Contributed at"}{" "}
            <Link href={`/stores/${c.store.id}`} className="text-teal-700 hover:underline">
              {c.store.name}
            </Link>{" "}
            <span className="text-stone-400">· {c.createdAt.toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
