// Coverage demand: where searches landed with no covered stores. Ranks ZIPs
// by request volume so expansion follows real demand. (This page was linked
// from the admin nav and checked by the e2e smoke test but its file was
// missing from the original commit — restored here as a read-only view.)

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coverage demand — NicFinder admin" };

export default async function CoveragePage() {
  const requests = await prisma.coverageRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const byZip = new Map<
    string,
    { n: number; members: number; latest: Date; city: string | null; state: string | null }
  >();
  for (const r of requests) {
    const cur = byZip.get(r.zip) ?? {
      n: 0,
      members: 0,
      latest: r.createdAt,
      city: r.city,
      state: r.state,
    };
    cur.n += 1;
    if (r.userId) cur.members += 1;
    if (r.createdAt > cur.latest) cur.latest = r.createdAt;
    cur.city = cur.city ?? r.city;
    cur.state = cur.state ?? r.state;
    byZip.set(r.zip, cur);
  }
  const rows = [...byZip.entries()]
    .map(([zip, v]) => ({ zip, ...v }))
    .sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...rows.map((r) => r.n));

  return (
    <div>
      <h1 className="text-xl font-semibold text-stone-900">Coverage demand</h1>
      <p className="mt-1 text-sm text-stone-500">
        Visitors who searched an uncovered area and asked for coverage —
        ranked by requests per ZIP (last {requests.length} requests).
        Member requests are deduplicated per user; guest requests are
        rate-limited by daily-salted IP hash.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">
          No coverage requests yet. They appear when visitors hit the
          “No coverage here yet” state and tap “Notify me / request coverage”.
        </p>
      ) : (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-3">ZIP</th>
              <th className="py-1.5 pr-3">Area</th>
              <th className="py-1.5 pr-3">Requests</th>
              <th className="py-1.5 pr-3">From members</th>
              <th className="py-1.5">Most recent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.zip} className="border-b border-stone-100">
                <td className="py-2 pr-3 font-medium text-stone-900">{r.zip}</td>
                <td className="py-2 pr-3 text-stone-600">
                  {r.city ? `${r.city}${r.state ? `, ${r.state}` : ""}` : "—"}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{r.n}</span>
                    <span
                      className="inline-block h-2 rounded bg-teal-500/70"
                      style={{ width: `${Math.round((r.n / maxN) * 120)}px` }}
                      aria-hidden
                    />
                  </div>
                </td>
                <td className="py-2 pr-3 text-stone-600 tabular-nums">{r.members}</td>
                <td className="py-2 text-stone-500">{r.latest.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
