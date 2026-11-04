// Manual admin price entry/correction.
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { parsePriceToCents, isPriceSane } from "@/lib/money";
import { audit } from "@/lib/audit";
import { cleanText } from "@/lib/validate";

export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const b = await req.json().catch(() => null);
    const storeId = String(b?.storeId ?? "");
    const productLineId = String(b?.productLineId ?? "");
    const priceCents = parsePriceToCents(b?.price);
    if (priceCents === null || !isPriceSane(priceCents))
      return NextResponse.json({ error: "Enter a sane price (e.g. 6.49)." }, { status: 400 });

    const [store, line] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.productLine.findUnique({ where: { id: productLineId } }),
    ]);
    if (!store || !line)
      return NextResponse.json({ error: "Store or product not found." }, { status: 404 });

    const observedAt = b?.observedAt ? new Date(String(b.observedAt)) : new Date();
    if (Number.isNaN(observedAt.getTime()) || observedAt.getTime() > Date.now() + 86400_000)
      return NextResponse.json({ error: "Invalid observation date." }, { status: 400 });

    const obs = await prisma.priceObservation.create({
      data: {
        storeId,
        productLineId,
        priceCents,
        taxIncluded: typeof b?.taxIncluded === "boolean" ? b.taxIncluded : null,
        availability: ["IN_STOCK", "OUT_OF_STOCK", "NOT_CARRIED", "UNKNOWN"].includes(b?.availability)
          ? b.availability
          : "UNKNOWN",
        observedAt,
        sourceType: "ADMIN",
        notes: b?.notes ? cleanText(b.notes, 500) || null : null,
      },
    });
    await audit("ADMIN_PRICE_ENTERED", {
      userId: user.id,
      targetType: "observation",
      targetId: obs.id,
      detail: { storeId, priceCents },
    });
    return NextResponse.json({ ok: true, id: obs.id });
  });
}
