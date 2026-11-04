import { prisma } from "@/lib/db";
import Link from "next/link";
import { DuplicateList } from "./DuplicateList";
import { DuplicateScanButton } from "./DuplicateScanButton";
import { ManualEntry } from "./ManualEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stores — NicFinder admin" };

export default async function AdminStores({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [stores, duplicates, productLines] = await Promise.all([
    prisma.store.findMany({
      where: {
        status: "ACTIVE",
        ...(q ? { OR: [{ name: { contains: q } }, { address: { contains: q } }, { zip: { contains: q } }] } : {}),
      },
      include: {
        observations: {
          where: { status: "ACTIVE" },
          orderBy: { observedAt: "desc" },
          take: 1,
        },
        _count: { select: { observations: true, comments: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.duplicateCandidate.findMany({
      where: { status: "OPEN" },
      include: {
        storeA: { select: { id: true, name: true, address: true, phone: true } },
        storeB: { select: { id: true, name: true, address: true, phone: true } },
      },
      take: 20,
    }),
    prisma.productLine.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-stone-900">Stores</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
          >
            Export prices (CSV)
          </a>
          <DuplicateScanButton />
        </div>
      </div>

      {duplicates.length > 0 && (
        <DuplicateList
          duplicates={duplicates.map((d) => ({
            id: d.id,
            reason: d.reason,
            a: d.storeA,
            b: d.storeB,
          }))}
        />
      )}

      <ManualEntry
        stores={stores.map((s) => ({ id: s.id, name: s.name, address: s.address }))}
        productLines={productLines.map((l) => ({ id: l.id, name: l.name }))}
      />

      <form className="mt-6 flex gap-2" action="/admin/stores">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter by name / address / ZIP"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm w-64"
        />
        <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Filter</button>
      </form>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
            <th className="py-2 pr-2">Store</th>
            <th className="py-2 pr-2">Address</th>
            <th className="py-2 pr-2">Phone</th>
            <th className="py-2 pr-2">Latest price</th>
            <th className="py-2">Obs / comments</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} className="border-b border-stone-100">
              <td className="py-2 pr-2">
                <Link href={`/stores/${s.id}`} className="text-teal-700 hover:underline">
                  {s.name}
                </Link>
                {s.isDemo && <span className="ml-1 text-[10px] text-amber-600">demo</span>}
              </td>
              <td className="py-2 pr-2 text-stone-500">
                {s.address}, {s.zip}
              </td>
              <td className="py-2 pr-2 text-stone-500">{s.phone ?? "—"}</td>
              <td className="py-2 pr-2">
                {s.observations[0]
                  ? `${
                      s.observations[0].priceCents !== null
                        ? `$${(s.observations[0].priceCents / 100).toFixed(2)}`
                        : s.observations[0].availability === "NOT_CARRIED"
                          ? "not carried"
                          : "no price"
                    } (${s.observations[0].observedAt.toLocaleDateString()})`
                  : <span className="text-stone-400">none</span>}
              </td>
              <td className="py-2 text-stone-500">
                {s._count.observations} / {s._count.comments}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
