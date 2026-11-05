import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { publishDispute, addReputation, REP_DELTAS } from "@/lib/reputation";
import { upholdFlag, dismissFlag, upholdDealFlag, dismissDealFlag } from "@/lib/flags";
import { setCommentVisibility } from "@/lib/comments";
import { publishDealReport, rejectDealReport } from "@/lib/deal-reports";
import { notifyReportResolved } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { cleanText } from "@/lib/validate";

export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const b = await req.json().catch(() => null);
    const action = String(b?.action ?? "");
    const targetId = String(b?.targetId ?? "");
    const reason = cleanText(b?.reason, 300);

    if (action === "APPROVE_CONTRIBUTION") {
      const c = await prisma.contribution.findUnique({ where: { id: targetId } });
      if (!c || !["PENDING", "CORROBORATING"].includes(c.status))
        return NextResponse.json({ error: "Contribution not reviewable." }, { status: 409 });
      if (c.kind === "FLAG_OBSERVATION")
        return NextResponse.json({ error: "Use UPHOLD_FLAG for observation flags." }, { status: 400 });
      // Review exists precisely so one person can't unilaterally publish a
      // flagged change — approving your own proposal would defeat it.
      if (c.userId === user.id)
        return NextResponse.json(
          { error: "You can’t approve your own contribution — another moderator must review it." },
          { status: 400 }
        );
      if (c.kind === "REPORT_DEAL") {
        const result = await publishDealReport(c.id, user.id);
        if (!result.ok)
          return NextResponse.json({ error: result.error }, { status: result.status });
        await prisma.moderationAction.create({
          data: { actorId: user.id, action, targetType: "contribution", targetId, reason: reason || "Deal approved" },
        });
        return NextResponse.json({ ok: true });
      }
      const outcome = await publishDispute(c.id, "moderator", user.id);
      if (outcome !== "published")
        return NextResponse.json(
          {
            error:
              outcome === "outdated"
                ? "Not published: a newer price observation exists — the proposal was resolved as outdated."
                : "Contribution was already resolved by someone else.",
          },
          { status: 409 }
        );
      await prisma.moderationAction.create({
        data: { actorId: user.id, action, targetType: "contribution", targetId, reason: reason || "Approved" },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "REJECT_CONTRIBUTION") {
      const c = await prisma.contribution.findUnique({ where: { id: targetId } });
      if (!c || !["PENDING", "CORROBORATING"].includes(c.status))
        return NextResponse.json({ error: "Contribution not reviewable." }, { status: 409 });
      if (c.kind === "FLAG_OBSERVATION")
        return NextResponse.json({ error: "Use DISMISS_FLAG for observation flags." }, { status: 400 });
      if (c.kind === "REPORT_DEAL") {
        const result = await rejectDealReport(c.id, user.id, reason);
        if (!result.ok)
          return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ ok: true });
      }
      if (!reason)
        return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 });
      // Atomic claim: only reject if still reviewable, so a concurrent
      // approve/reject can't double-apply the reputation penalty.
      const rejected = await prisma.$transaction(async (tx) => {
        const claimed = await tx.contribution.updateMany({
          where: { id: targetId, status: { in: ["PENDING", "CORROBORATING"] } },
          data: { status: "REJECTED", reviewedById: user.id, reviewNote: reason, resolvedAt: new Date() },
        });
        if (claimed.count === 0) return false;
        await addReputation(
          c.userId, REP_DELTAS.REPLACEMENT_REJECTED, "CONTRIBUTION_REJECTED",
          { type: "contribution", id: c.id }, tx
        );
        await tx.moderationAction.create({
          data: { actorId: user.id, action, targetType: "contribution", targetId, reason },
        });
        const storeRow = await tx.store.findUnique({
          where: { id: c.storeId },
          select: { name: true },
        });
        await notifyReportResolved(
          {
            userId: c.userId,
            storeId: c.storeId,
            storeName: storeRow?.name ?? "a store",
            what: "price report",
            outcome: "rejected",
            note: reason,
          },
          tx
        );
        return true;
      });
      if (!rejected)
        return NextResponse.json(
          { error: "Contribution was already resolved by someone else." },
          { status: 409 }
        );
      return NextResponse.json({ ok: true });
    }

    if (action === "UPHOLD_FLAG") {
      const result = await upholdFlag(targetId, user.id, reason || undefined);
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true });
    }

    if (action === "DISMISS_FLAG") {
      const result = await dismissFlag(targetId, user.id, reason);
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true });
    }

    if (action === "UPHOLD_DEAL_FLAG") {
      const how = b?.how === "invalid" ? "invalid" : "ended";
      const result = await upholdDealFlag(targetId, user.id, how, reason || undefined);
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true });
    }

    if (action === "DISMISS_DEAL_FLAG") {
      const result = await dismissDealFlag(targetId, user.id, reason);
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true });
    }

    if (action === "HIDE_COMMENT" || action === "RESTORE_COMMENT") {
      const comment = await prisma.comment.findUnique({ where: { id: targetId } });
      if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
      const changed = await setCommentVisibility(targetId, action === "RESTORE_COMMENT");
      if (!changed) {
        const fromStatus = action === "HIDE_COMMENT" ? "visible" : "hidden";
        return NextResponse.json(
          { error: `Comment is not ${fromStatus} — nothing to ${action === "HIDE_COMMENT" ? "hide" : "restore"}.` },
          { status: 409 }
        );
      }
      await prisma.moderationAction.create({
        data: { actorId: user.id, action, targetType: "comment", targetId, reason: reason || action },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "INVALIDATE_OBSERVATION") {
      if (!reason)
        return NextResponse.json({ error: "A reason is required." }, { status: 400 });
      const obs = await prisma.priceObservation.findUnique({ where: { id: targetId } });
      if (!obs) return NextResponse.json({ error: "Observation not found." }, { status: 404 });
      await prisma.priceObservation.update({
        where: { id: targetId },
        data: { status: "INVALIDATED", invalidReason: reason },
      });
      await prisma.moderationAction.create({
        data: { actorId: user.id, action, targetType: "observation", targetId, reason },
      });
      await audit("OBSERVATION_INVALIDATED", { userId: user.id, targetType: "observation", targetId });
      return NextResponse.json({ ok: true });
    }

    if (action === "SUSPEND_USER" || action === "REINSTATE_USER") {
      if (user.role !== "ADMIN")
        return NextResponse.json({ error: "Admin only." }, { status: 403 });
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      if (target.role === "ADMIN")
        return NextResponse.json({ error: "Cannot suspend an admin." }, { status: 400 });
      // State-gated so repeated SUSPEND calls can't stack -15 penalties.
      const fromUserStatus = action === "SUSPEND_USER" ? "ACTIVE" : "SUSPENDED";
      const flipped = await prisma.user.updateMany({
        where: { id: targetId, status: fromUserStatus },
        data: { status: action === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE" },
      });
      if (flipped.count === 0)
        return NextResponse.json(
          { error: `User is not ${fromUserStatus.toLowerCase()}.` },
          { status: 409 }
        );
      if (action === "SUSPEND_USER") {
        await prisma.authSession.deleteMany({ where: { userId: targetId } });
        await addReputation(targetId, REP_DELTAS.ABUSE_PENALTY, "ABUSE_PENALTY", { type: "admin", id: user.id });
      }
      await prisma.moderationAction.create({
        data: { actorId: user.id, action, targetType: "user", targetId, reason: reason || action },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  });
}
