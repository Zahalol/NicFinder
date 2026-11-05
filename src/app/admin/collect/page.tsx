// Price-collection worksheet: the fastest path through business gate G1
// (manually collecting real prices for the directory stores). One row per
// real store — tap-to-call, type the price (or mark not carried / out of
// stock with no price), Enter saves via the normal admin-entry API with
// full audit + watcher notifications.
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice } from "@/lib/prices";
import { formatCents } from "@/lib/money";
import { CollectRow } from "./CollectRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collect prices — NicFinder admin" };

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export default async function CollectPage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>;
}) {
  const { line: lineParam } = await searchParams;
  const settings = await getSettings();
  const [stores, lines] = await Promise.all([
    prisma.store.findMany({
      where: { status: "ACTIVE", isDemo: false },
      include: {
        observations: {
          where: { status: "ACTIVE" },
          include: { verifications: true },
          orderBy: { observedAt: "desc" },
          take: 10,
        },
      },
      orderBy: [{ zip: "asc" }, { name: "asc" }],
    }),
    prisma.productLine.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const zyn = lines.find((l) => l.slug === lineParam) ?? lines[0];
  if (!zyn) return <p className="text-sm text-stone-500">No product lines seeded.</p>;

  const rows = stores.map((s) => {
    const latest = selectLatestPrice(
      s.observations.filter((o) => o.productLineId === zyn.id),
      settings
    );
    return {
      id: s.id,
      name: s.name,
      address: [s.address, s.zip].filter(Boolean).join(" · "),
      phone: s.phone,
      phoneDisplay: s.phone ? formatPhone(s.phone) : null,
      lastPrice: latest ? formatCents(latest.observation.priceCents) : null,
      lastAge: latest
        ? latest.ageDays === 0
          ? "today"
          : `${latest.ageDays}d ago`
        : null,
    };
  });
  const unpriced = rows.filter((r) => !r.lastPrice).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-stone-900">Collect prices — {zyn.name}</h1>
        <span className="inline-flex rounded-lg border border-stone-300 overflow-hidden text-sm">
          {lines.map((l) => (
            <a
              key={l.slug}
              href={`/admin/collect?line=${l.slug}`}
              aria-current={l.id === zyn.id ? "true" : undefined}
              className={`px-3 py-1 ${l.id === zyn.id ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}
            >
              {l.name.replace(" (regular)", "")}
            </a>
          ))}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-stone-500">
        {rows.length} real stores · {unpriced} without a current price. Call,
        type the shelf price, Enter. “Not carried” / “out of stock” save
        honestly with no price. Entries are staff-sourced, audited, and alert
        watchers. Demo stores are excluded.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-stone-400">No real stores in the directory.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="py-1.5 pr-3">Store</th>
              <th className="py-1.5 pr-3">Phone</th>
              <th className="py-1.5 pr-3">Current price</th>
              <th className="py-1.5">New observation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <CollectRow key={r.id} store={r} productLineId={zyn.id} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
