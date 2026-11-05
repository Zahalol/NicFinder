import { requireStaffPage } from "@/lib/page-auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { DuplicateList } from "./DuplicateList";
import { DuplicateScanButton } from "./DuplicateScanButton";
import { StoreStatusButton } from "./StoreStatusButton";
import { EditHoursButton } from "./EditHoursButton";
import { ManualEntry } from "./ManualEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stores — NicFinder admin" };

export default async function AdminStores({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaffPage();
  const { q } = await searchParams;
  const [stores, duplicates, productLines, retired] = await Promise.all([
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
    prisma.store.findMany({
      where: { status: "RETIRED" },
      select: { id: true, name: true, address: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Stores</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export"
            className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
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
          className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm w-64"
        />
        <button className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm">Filter</button>
      </form>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
            <th className="py-2 pr-2">Store</th>
            <th className="py-2 pr-2">Address</th>
            <th className="py-2 pr-2">Phone</th>
            <th className="py-2 pr-2">Latest price</th>
            <th className="py-2">Obs / comments</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} className="border-b border-stone-100 dark:border-stone-800">
              <td className="py-2 pr-2">
                <Link href={`/stores/${s.id}`} className="text-teal-700 dark:text-teal-400 hover:underline">
                  {s.name}
                </Link>
                {s.isDemo && <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">demo</span>}
              </td>
              <td className="py-2 pr-2 text-stone-500 dark:text-stone-400">
                {s.address}, {s.zip}
              </td>
              <td className="py-2 pr-2 text-stone-500 dark:text-stone-400">{s.phone ?? "—"}</td>
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
              <td className="py-2 text-stone-500 dark:text-stone-400">
                {s._count.observations} / {s._count.comments}
              </td>
              <td className="py-2 pl-2 text-right whitespace-nowrap">
                <EditHoursButton storeId={s.id} hours={s.hours} />{" "}
                <StoreStatusButton storeId={s.id} mode="retire" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {retired.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-stone-700 dark:text-stone-300">
            Retired stores ({retired.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {retired.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-500 dark:text-stone-400">
                <span>
                  {r.name} <span className="text-xs">{r.address}</span>
                </span>
                <StoreStatusButton storeId={r.id} mode="restore" />
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-stone-400">
            Retired stores keep their full history and can be restored any time.
          </p>
        </details>
      )}
    </div>
  );
}
