import { requireStaffPage } from "@/lib/page-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { BatchActions } from "./BatchActions";
import { MappingEditor } from "./MappingEditor";

export const dynamic = "force-dynamic";

const OUTCOME_STYLE: Record<string, string> = {
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  UPDATED: "bg-teal-50 text-teal-700",
  SKIPPED_DUPLICATE: "bg-stone-100 text-stone-500",
  FLAGGED: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    include: {
      rows: { orderBy: { rowNumber: "asc" }, take: 500 },
      uploadedBy: { select: { displayName: true } },
    },
  });
  if (!batch) notFound();

  const mapping = JSON.parse(batch.mappingJson) as Record<string, string | null>;

  return (
    <div>
      <Link href="/admin/imports" className="text-sm text-stone-500 hover:text-stone-900">← All imports</Link>
      <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{batch.filename}</h1>
          <p className="text-sm text-stone-500">
            {batch.fileType.toUpperCase()} · uploaded {batch.createdAt.toLocaleString()} by{" "}
            {batch.uploadedBy?.displayName ?? "—"} · status{" "}
            <strong>{batch.status.toLowerCase()}</strong>
            {batch.reversedAt && ` (reversed ${batch.reversedAt.toLocaleString()}: ${batch.reverseReason})`}
          </p>
        </div>
        <BatchActions batchId={batch.id} status={batch.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {[
          ["Total", batch.totalRows],
          ["New", batch.acceptedRows],
          ["Updates", batch.updatedRows],
          ["Skipped", batch.skippedRows],
          ["Flagged", batch.flaggedRows],
          ["Rejected", batch.rejectedRows],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border border-stone-200 bg-white p-2">
            <div className="text-lg font-semibold text-stone-900">{n}</div>
            <div className="text-[11px] text-stone-500">{label}</div>
          </div>
        ))}
      </div>

      {batch.status === "PREVIEW" && <MappingEditor batchId={batch.id} mapping={mapping} />}

      <h2 className="mt-6 font-medium text-stone-900">
        Rows {batch.rows.length === 500 ? "(first 500)" : ""}
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">Outcome</th>
              <th className="py-1.5 pr-2">Issues</th>
              <th className="py-1.5">Data</th>
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((r) => {
              const issues = JSON.parse(r.issuesJson) as { code: string; message: string }[];
              const raw = JSON.parse(r.rawJson) as Record<string, unknown>;
              return (
                <tr key={r.id} className="border-b border-stone-100 align-top">
                  <td className="py-1.5 pr-2 text-stone-400">{r.rowNumber}</td>
                  <td className="py-1.5 pr-2">
                    <span className={`rounded px-1.5 py-0.5 ${OUTCOME_STYLE[r.outcome] ?? ""}`}>
                      {r.outcome.toLowerCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-stone-600 max-w-60">
                    {issues.map((i) => i.message).join("; ") || "—"}
                  </td>
                  <td className="py-1.5 text-stone-600 font-mono max-w-xl truncate">
                    {Object.entries(raw)
                      .filter(([, v]) => v !== null && v !== "")
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join("  ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
