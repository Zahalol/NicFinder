// CSV export of current displayed prices — owner backup / spreadsheet
// workflows. One row per store x product line, using the same latest-price
// policy as the site. Staff-only.
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { selectLatestPrice, selectLatestAvailability } from "@/lib/prices";

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote when needed; prefix risky leading chars so spreadsheet apps never
  // execute a cell as a formula (CSV injection).
  const guarded = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export async function GET() {
  return withStaff(async () => {
    const settings = await getSettings();
    const [stores, lines] = await Promise.all([
      prisma.store.findMany({
        where: { status: "ACTIVE" },
        include: {
          observations: {
            where: { status: "ACTIVE" },
            include: { verifications: true },
            orderBy: { observedAt: "desc" },
            take: 20,
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.productLine.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    const header = [
      "store_id",
      "store_name",
      "address",
      "city",
      "state",
      "zip",
      "hours",
      "is_demo",
      "product_line",
      "price_usd",
      "observed_at",
      "age_days",
      "freshness",
      "source",
      "confirms",
      "disputes",
      "availability",
    ];
    const rows: string[] = [header.join(",")];
    for (const s of stores) {
      for (const line of lines) {
        const obs = s.observations.filter((o) => o.productLineId === line.id);
        const latest = selectLatestPrice(obs, settings);
        const avail = selectLatestAvailability(obs, settings);
        if (!latest && !avail) continue; // nothing known — no row, no invention
        rows.push(
          [
            csvCell(s.id),
            csvCell(s.name),
            csvCell(s.address),
            csvCell(s.city),
            csvCell(s.state),
            csvCell(s.zip),
            csvCell(s.hours),
            csvCell(s.isDemo ? "true" : "false"),
            csvCell(line.slug),
            csvCell(latest ? (latest.observation.priceCents / 100).toFixed(2) : ""),
            csvCell(latest ? latest.observation.observedAt.toISOString() : ""),
            csvCell(latest ? latest.ageDays : ""),
            csvCell(latest ? latest.freshness : ""),
            csvCell(latest ? latest.observation.sourceType : ""),
            csvCell(latest ? latest.confirmCount : ""),
            csvCell(latest ? latest.disputeCount : ""),
            csvCell(avail?.availability ?? latest?.observation.availability ?? ""),
          ].join(",")
        );
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(rows.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nicfinder-prices-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
