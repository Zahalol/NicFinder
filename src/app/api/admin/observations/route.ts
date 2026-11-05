// Manual admin price entry/correction.
import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { parsePriceToCents, isPriceSane } from "@/lib/money";
import { audit } from "@/lib/audit";
import { notifyPriceChange, maybeNotifyCoverageArrived, zipHasPricedStore } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const b = await req.json().catch(() => null);
    const storeId = String(b?.storeId ?? "");
    const productLineId = String(b?.productLineId ?? "");
    const availabilityIn = ["IN_STOCK", "OUT_OF_STOCK", "NOT_CARRIED", "UNKNOWN"].includes(b?.availability)
      ? (b.availability as string)
      : "UNKNOWN";
    const priceCents = parsePriceToCents(b?.price);
    const availabilityOnly =
      (b?.price === undefined || b?.price === null || b?.price === "") &&
      (availabilityIn === "NOT_CARRIED" || availabilityIn === "OUT_OF_STOCK");
    // Same rule as imports: a price must be sane, OR the row may assert an
    // explicit no-price availability fact — never an empty observation.
    if (!availabilityOnly && (priceCents === null || !isPriceSane(priceCents)))
      return NextResponse.json({ error: "Enter a sane price (e.g. 6.49) — or pick “not carried”/“out of stock” with no price." }, { status: 400 });

    const [store, line] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.productLine.findUnique({ where: { id: productLineId } }),
    ]);
    if (!store || !line)
      return NextResponse.json({ error: "Store or product not found." }, { status: 404 });

    const observedAt = b?.observedAt ? new Date(String(b.observedAt)) : new Date();
    if (Number.isNaN(observedAt.getTime()) || observedAt.getTime() > Date.now() + 86400_000)
      return NextResponse.json({ error: "Invalid observation date." }, { status: 400 });

    const prev = availabilityOnly ? null : await prisma.priceObservation.findFirst({
      where: { storeId, productLineId, status: "ACTIVE", priceCents: { not: null } },
      orderBy: { observedAt: "desc" },
      select: { priceCents: true },
    });

    const zipHadPricedStoreBefore = availabilityOnly
      ? true // irrelevant: availability-only never triggers coverage notices
      : await zipHasPricedStore(store.zip);

    const obs = await prisma.priceObservation.create({
      data: {
        storeId,
        productLineId,
        priceCents: availabilityOnly ? null : priceCents,
        taxIncluded: typeof b?.taxIncluded === "boolean" ? b.taxIncluded : null,
        availability: availabilityIn,
        observedAt,
        sourceType: "ADMIN",
        notes: b?.notes ? String(b.notes).slice(0, 500) : null,
      },
    });
    await audit("ADMIN_PRICE_ENTERED", {
      userId: user.id,
      targetType: "observation",
      targetId: obs.id,
      detail: { storeId, priceCents },
    });
    await notifyPriceChange({
      storeId,
      storeName: store.name,
      productLineName: line.name,
      newPriceCents: availabilityOnly ? null : priceCents,
      previousPriceCents: prev?.priceCents ?? null,
      actorUserId: user.id,
    });
    if (!availabilityOnly) {
      await maybeNotifyCoverageArrived({
        zip: store.zip,
        storeName: store.name,
        zipHadPricedStoreBefore,
      });
    }
    return NextResponse.json({ ok: true, id: obs.id });
  });
}
