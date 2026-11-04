import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { publishDispute, addReputation, REP_DELTAS } from "@/lib/reputation";
import { upholdFlag, dismissFlag } from "@/lib/flags";
import { setCommentVisibility } from "@/lib/comments";
import { publishDealReport, rejectDealReport } from "@/lib/deal-reports";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const b = await req.json().catch(() => null);
    const action = String(b?.action ?? "");
    const targetId = String(b?.targetId ?? "");
    const reason = String(b?.reason ?? "").slice(0, 300);

    if (action === "APPROVE_CONTRIBUTION") {
      const c = await prisma.contribution.findUnique({ where: { id: targetId } });
      if (!c || !["PENDING", "CORROBORATING"].includes(c.status))
        return NextResponse.json({ error: "Contribution not reviewable." }, { status: 409 });
      if (c.kind === "FLAG_OBSERVATION")
        return NextResponse.json({ error: "Use UPHOLD_FLAG for observation flags." }, { status: 400 });
      if (c.kind === "REPORT_DEAL") {
        const result = await publishDealReport(c.id, user.id);
        if (!result.ok)
          return NextResponse.json({ error: result.error }, { status: result.status });
        await prisma.moderationAction.create({
          data: { actorId: user.id, action, targetType: "contribution", targetId, reason: reason || "Deal approved" },
        });
        return NextResponse.json({ ok: true });
      }
      await publishDispute(c.id, "moderator", user.id);
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
      await prisma.$transaction(async (tx) => {
        await tx.contribution.update({
          where: { id: targetId },
          data: { status: "REJECTED", reviewedById: user.id, reviewNote: reason, resolvedAt: new Date() },
        });
        await addReputation(
          c.userId, REP_DELTAS.REPLACEMENT_REJECTED, "CONTRIBUTION_REJECTED",
          { type: "contribution", id: c.id }, tx
        );
        await tx.moderationAction.create({
          data: { actorId: user.id, action, targetType: "contribution", targetId, reason },
        });
      });
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

    if (action === "HIDE_COMMENT" || action === "RESTORE_COMMENT") {
      const comment = await prisma.comment.findUnique({ where: { id: targetId } });
      if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
      await setCommentVisibility(targetId, action === "RESTORE_COMMENT");
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
      await prisma.user.update({
        where: { id: targetId },
        data: { status: action === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE" },
      });
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
