// Comment moderation helpers (kept in lib so the dedupe/auto-hide policy is
// unit-testable apart from the HTTP route).

import { prisma } from "./db";
import type { AppSettings } from "./settings";

export type ReportResult =
  | { ok: true; already: boolean; hidden: boolean }
  | { ok: false; error: string; status: number };

/**
 * Moderator hide/restore. Restoring also clears the report ledger —
 * otherwise one new report would recount all old distinct reporters and
 * instantly re-hide the comment, overriding the moderator's decision.
 */
export async function setCommentVisibility(
  commentId: string,
  visible: boolean
): Promise<boolean> {
  // State-gated: hide only VISIBLE, restore only HIDDEN. In particular a
  // comment the author DELETED must never be made public again by a
  // moderator "restore". Returns false when not in the expected state.
  return prisma.$transaction(async (tx) => {
    const res = await tx.comment.updateMany({
      where: { id: commentId, status: visible ? "HIDDEN" : "VISIBLE" },
      data: { status: visible ? "VISIBLE" : "HIDDEN", reportCount: 0 },
    });
    if (res.count === 0) return false;
    await tx.commentReport.deleteMany({ where: { commentId } });
    return true;
  });
}

/**
 * Report a comment. One report counts per user per comment (unique
 * constraint) so a single account can never auto-hide someone else's comment
 * by reporting it repeatedly. Authors cannot report their own comments.
 * The threshold can be passed as a number or as the settings object.
 */
export async function reportComment(
  commentId: string,
  userId: string,
  threshold: number | Pick<AppSettings, "autoHideReportCount">
): Promise<ReportResult> {
  const autoHideReportCount =
    typeof threshold === "number" ? threshold : threshold.autoHideReportCount;
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.status !== "VISIBLE")
    return { ok: false, error: "Comment not found.", status: 404 };
  if (comment.userId === userId)
    return { ok: false, error: "You can’t report your own comment.", status: 400 };

  // createMany + skipDuplicates: concurrent/repeat reports hit the unique
  // constraint and count 0, without aborting (Postgres transaction rule).
  const created = await prisma.commentReport.createMany({
    data: [{ commentId, userId }],
    skipDuplicates: true,
  });
  if (created.count === 0) {
    return { ok: true, already: true, hidden: false };
  }

  const distinctReports = await prisma.commentReport.count({ where: { commentId } });
  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { reportCount: distinctReports },
  });
  if (updated.reportCount >= autoHideReportCount && updated.status === "VISIBLE") {
    await prisma.comment.update({
      where: { id: commentId },
      data: { status: "HIDDEN" },
    });
    return { ok: true, already: false, hidden: true };
  }
  return { ok: true, already: false, hidden: false };
}
