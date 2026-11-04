import { prisma } from "@/lib/db";
import Link from "next/link";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imports — NicFinder admin" };

const STATUS_STYLE: Record<string, string> = {
  PREVIEW: "bg-amber-50 text-amber-700",
  COMMITTED: "bg-emerald-50 text-emerald-700",
  REVERSED: "bg-red-50 text-red-700",
};

export default async function ImportsPage() {
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { uploadedBy: { select: { displayName: true } } },
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-stone-900">Data imports</h1>
      <p className="text-sm text-stone-500 mt-1">
        Upload CSV or XLSX observation files (see <code>docs/IMPORT_CONTRACT.md</code> and{" "}
        <code>sample-data/</code>). Files are previewed and validated before anything
        is applied; committed imports can be reversed without losing history.
      </p>

      <UploadForm />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
            <th className="py-2 pr-2">File</th>
            <th className="py-2 pr-2">Uploaded</th>
            <th className="py-2 pr-2">Status</th>
            <th className="py-2 pr-2">Rows (ok/upd/skip/flag/rej)</th>
            <th className="py-2">By</th>
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 && (
            <tr><td colSpan={5} className="py-4 text-stone-400">No imports yet.</td></tr>
          )}
          {batches.map((b) => (
            <tr key={b.id} className="border-b border-stone-100">
              <td className="py-2 pr-2">
                <Link href={`/admin/imports/${b.id}`} className="text-teal-700 hover:underline">
                  {b.filename}
                </Link>
              </td>
              <td className="py-2 pr-2 text-stone-500">{b.createdAt.toLocaleString()}</td>
              <td className="py-2 pr-2">
                <span className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLE[b.status] ?? ""}`}>
                  {b.status.toLowerCase()}
                </span>
              </td>
              <td className="py-2 pr-2 text-stone-600">
                {b.acceptedRows}/{b.updatedRows}/{b.skippedRows}/{b.flaggedRows}/{b.rejectedRows}
                <span className="text-stone-400"> of {b.totalRows}</span>
              </td>
              <td className="py-2 text-stone-500">{b.uploadedBy?.displayName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
