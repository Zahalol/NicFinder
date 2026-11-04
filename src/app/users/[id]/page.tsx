import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
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
      _count: { select: { contributions: true, verifications: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") notFound();

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900">{user.displayName}</h1>
      <p className="text-sm text-stone-500">
        Member since {user.createdAt.toLocaleDateString()} · reputation {user.reputation} ·{" "}
        {user._count.contributions} contributions · {user._count.verifications} confirmations
      </p>

      <h2 className="mt-6 font-medium text-stone-900">Recent published activity</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
        {user.contributions.length === 0 && (
          <li className="text-stone-400">No published contributions yet.</li>
        )}
        {user.contributions.map((c) => (
          <li key={c.id}>
            {c.kind === "CONFIRM" ? "Confirmed a price at" : "Updated the price at"}{" "}
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
