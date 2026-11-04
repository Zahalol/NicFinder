// Comment reporting with per-user dedupe. One report per user per comment
// (unique constraint on CommentReport) — the auto-hide threshold counts
// DISTINCT reporters, so a single account cannot hide someone else's
// comment by reporting it repeatedly.

import { prisma } from "./db";
import type { AppSettings } from "./settings";

export type ReportResult =
  | { ok: true; already: boolean; hidden: boolean }
  | { ok: false; status: number; error: string };

export async function reportComment(
  commentId: string,
  reporterId: string,
  settings: Pick<AppSettings, "autoHideReportCount">
): Promise<ReportResult> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.status !== "VISIBLE")
    return { ok: false, status: 404, error: "Comment not found." };
  if (comment.userId === reporterId)
    return { ok: false, status: 400, error: "You can’t report your own comment." };

  const created = await prisma.commentReport.createMany({
    data: [{ commentId, userId: reporterId }],
    skipDuplicates: true,
  });
  if (created.count === 0) return { ok: true, already: true, hidden: false };

  const reporters = await prisma.commentReport.count({ where: { commentId } });
  const hide = reporters >= settings.autoHideReportCount;
  await prisma.comment.update({
    where: { id: commentId },
    data: { reportCount: reporters, ...(hide ? { status: "HIDDEN" } : {}) },
  });
  return { ok: true, already: false, hidden: hide };
}
