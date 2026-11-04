import { NextResponse, type NextRequest } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { normalizePhone, normalizeAddress } from "@/lib/normalize";
import { audit } from "@/lib/audit";

// Create a store manually.
export async function POST(req: NextRequest) {
  return withStaff(async (user) => {
    const b = await req.json().catch(() => null);
    const name = String(b?.name ?? "").trim();
    if (name.length < 2)
      return NextResponse.json({ error: "Name required." }, { status: 400 });
    const lat = b?.latitude !== undefined && b?.latitude !== "" ? Number(b.latitude) : null;
    const lng = b?.longitude !== undefined && b?.longitude !== "" ? Number(b.longitude) : null;
    if ((lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) ||
        (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)))
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });

    const store = await prisma.store.create({
      data: {
        name,
        address: b?.address ? String(b.address).trim() : null,
        city: b?.city ? String(b.city).trim() : null,
        state: b?.state ? String(b.state).trim().toUpperCase().slice(0, 2) : null,
        zip: b?.zip ? String(b.zip).trim().slice(0, 5) : null,
        latitude: lat,
        longitude: lng,
        phone: normalizePhone(b?.phone),
        isDemo: Boolean(b?.isDemo),
      },
    });
    const addr = normalizeAddress(
      [store.address, store.city, store.state, store.zip].filter(Boolean).join(" ")
    );
    if (addr)
      await prisma.storeIdentity
        .create({ data: { storeId: store.id, kind: "ADDRESS", value: addr } })
        .catch(() => {});
    if (store.phone)
      await prisma.storeIdentity
        .create({ data: { storeId: store.id, kind: "PHONE", value: store.phone } })
        .catch(() => {});

    await audit("STORE_CREATED", { userId: user.id, targetType: "store", targetId: store.id });
    return NextResponse.json({ ok: true, id: store.id });
  });
}
