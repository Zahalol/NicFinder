// Resolve a duplicate-store candidate: merge B into A, or dismiss.
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

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
      await prisma.duplicateCandidate.update({
        where: { id },
        data: { status: "DISMISSED", resolvedBy: user.id, resolvedAt: new Date() },
      });
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

      await prisma.$transaction(async (tx) => {
        // Move evidence and identities to the surviving store.
        await tx.priceObservation.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.quantityDeal.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.contribution.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
        await tx.comment.updateMany({ where: { storeId: mergeId }, data: { storeId: keepId } });
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
        await tx.duplicateCandidate.update({
          where: { id },
          data: { status: "MERGED", resolvedBy: user.id, resolvedAt: new Date() },
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
      });
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
