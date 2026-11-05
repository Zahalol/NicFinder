// Resolve a duplicate-store candidate: merge B into A, or dismiss.
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

/** Thrown inside the merge transaction to roll it back with a 409 message. */
class MergeAbort extends Error {}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withStaff(async (user) => {
    const { id } = await params;
    const b = await req.json().catch(() => null);
    const action = b?.action as "merge" | "dismiss" | undefined;
    const candidate = await prisma.duplicateCandidate.findUnique({ where: { id } });
    if (!candidate || candidate.status !== "OPEN")
      return NextResponse.json({ error: "Candidate not found or resolved." }, { status: 404 });

    if (action === "dismiss") {
      const claimed = await prisma.duplicateCandidate.updateMany({
        where: { id, status: "OPEN" },
        data: { status: "DISMISSED", resolvedBy: user.id, resolvedAt: new Date() },
      });
      if (claimed.count === 0)
        return NextResponse.json({ error: "Candidate already resolved." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    if (action === "merge") {
      // keepId must be one of the pair; the other is merged into it.
      const keepId = String(b?.keepId ?? "");
      const mergeId =
        keepId === candidate.storeAId
          ? candidate.storeBId
          : keepId === candidate.storeBId
            ? candidate.storeAId
            : null;
      if (!mergeId)
        return NextResponse.json({ error: "keepId must be one of the pair." }, { status: 400 });

      const outcome = await prisma.$transaction(async (tx) => {
        // Atomic claim: resolve the candidate exactly once (concurrent
        // opposite-keep merges previously MERGED both stores into each
        // other, making the store vanish entirely).
        const claimed = await tx.duplicateCandidate.updateMany({
          where: { id, status: "OPEN" },
          data: { status: "MERGED", resolvedBy: user.id, resolvedAt: new Date() },
        });
        if (claimed.count === 0) return "already-resolved" as const;

        // Both stores must still be ACTIVE: merging into (or from) a store
        // that an earlier merge already hid would move evidence into an
        // invisible store (chained candidates: (A,B) merged, then (B,C)).
        const pair = await tx.store.findMany({
          where: { id: { in: [keepId, mergeId] } },
          select: { id: true, status: true },
        });
        if (pair.length !== 2 || pair.some((s) => s.status !== "ACTIVE")) {
          throw new MergeAbort(
            "One of the stores was already merged or retired — refresh the duplicate list."
          );
        }

        // Move evidence and identities to the surviving store.
        await tx.priceObservation.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.quantityDeal.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.contribution.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.comment.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        // Watchlists follow the surviving store (dedupe on the unique pair).
        const saved = await tx.savedStore.findMany({ where: { storeId: mergeId } });
        if (saved.length) {
          await tx.savedStore.createMany({
            data: saved.map((s) => ({ userId: s.userId, storeId: keepId })),
            skipDuplicates: true,
          });
          await tx.savedStore.deleteMany({ where: { storeId: mergeId } });
        }
        const identities = await tx.storeIdentity.findMany({ where: { storeId: mergeId } });
        await tx.storeIdentity.deleteMany({ where: { storeId: mergeId } });
        if (identities.length) {
          // skipDuplicates: the surviving store may already hold an identity
          await tx.storeIdentity.createMany({
            data: identities.map((i) => ({ storeId: keepId, kind: i.kind, value: i.value, source: i.source })),
            skipDuplicates: true,
          });
        }
        await tx.store.update({
          where: { id: mergeId },
          data: { status: "MERGED", mergedIntoId: keepId },
        });
        await tx.moderationAction.create({
          data: {
            actorId: user.id,
            action: "MERGE_STORES",
            targetType: "store",
            targetId: mergeId,
            reason: `Merged into ${keepId}`,
          },
        });
        return "merged" as const;
      }).catch((e) => {
        if (e instanceof MergeAbort) return e.message;
        throw e;
      });
      if (outcome === "already-resolved")
        return NextResponse.json({ error: "Candidate already resolved." }, { status: 409 });
      if (outcome !== "merged")
        return NextResponse.json({ error: outcome }, { status: 409 });
      await audit("STORES_MERGED", {
        userId: user.id,
        targetType: "store",
        targetId: mergeId,
        detail: { into: keepId },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  });
}
