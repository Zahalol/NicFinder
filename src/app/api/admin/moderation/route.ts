import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { publishDispute, addReputation, REP_DELTAS } from "@/lib/reputation";
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
      const published = await publishDispute(c.id, "moderator", user.id);
      if (!published)
        return NextResponse.json(
          { error: "Contribution was already resolved by someone else." },
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
        return true;
      });
      if (!rejected)
        return NextResponse.json(
          { error: "Contribution was already resolved by someone else." },
          { status: 409 }
        );
      return NextResponse.json({ ok: true });
    }

    if (action === "HIDE_COMMENT" || action === "RESTORE_COMMENT") {
      const comment = await prisma.comment.findUnique({ where: { id: targetId } });
      if (!comment) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
      await prisma.$transaction([
        prisma.comment.update({
          where: { id: targetId },
          data: { status: action === "HIDE_COMMENT" ? "HIDDEN" : "VISIBLE", reportCount: 0 },
        }),
        // Clear the report records too: a restored comment starts with a
        // clean slate, otherwise the old reporters still count toward the
        // auto-hide threshold on the very next report.
        prisma.commentReport.deleteMany({ where: { commentId: targetId } }),
      ]);
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
