// "Request coverage here" — works for guests (hashed-IP dedupe + daily cap)
// and signed-in users (one request per ZIP per account).
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { zipInfo, nearestZip, geocodeZip } from "@/lib/geocode";

function hashIp(ip: string): string {
  // Daily-salted hash — never store raw IPs, and hashes expire naturally.
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.SESSION_SECRET ?? "dev";
  return createHash("sha256").update(`${ip}|${salt}|${day}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  const body = await req.json().catch(() => null);

  let zip = String(body?.zip ?? "").trim().slice(0, 5);
  const lat = body?.lat !== undefined ? Number(body.lat) : null;
  const lng = body?.lng !== undefined ? Number(body.lng) : null;

  // Resolve a ZIP: given directly, or nearest to the searched coordinates.
  if (!/^\d{5}$/.test(zip)) {
    if (
      lat !== null && lng !== null &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ) {
      const nearest = nearestZip(lat, lng);
      if (nearest) zip = nearest.zip;
    }
  }
  if (!/^\d{5}$/.test(zip) || !geocodeZip(zip)) {
    return NextResponse.json(
      { error: "Couldn’t determine a valid US ZIP code for this request." },
      { status: 400 }
    );
  }

  const info = zipInfo(zip);
  const centroid = geocodeZip(zip);

  if (user) {
    const existing = await prisma.coverageRequest.findFirst({
      where: { zip, userId: user.id },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "You’ve already requested this area — it’s on the list.",
      });
    }
    await prisma.coverageRequest.create({
      data: {
        zip,
        city: info?.city,
        state: info?.state,
        latitude: centroid?.latitude,
        longitude: centroid?.longitude,
        userId: user.id,
      },
    });
  } else {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const ipHash = hashIp(ip);
    const [sameZip, today] = await Promise.all([
      prisma.coverageRequest.count({ where: { zip, ipHash } }),
      prisma.coverageRequest.count({ where: { ipHash } }),
    ]);
    if (sameZip > 0) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "Already counted — this area is on the list.",
      });
    }
    if (today >= 5) {
      return NextResponse.json(
        { error: "Daily request limit reached — sign in to request more areas." },
        { status: 429 }
      );
    }
    await prisma.coverageRequest.create({
      data: {
        zip,
        city: info?.city,
        state: info?.state,
        latitude: centroid?.latitude,
        longitude: centroid?.longitude,
        ipHash,
      },
    });
  }

  const count = await prisma.coverageRequest.count({ where: { zip } });
  return NextResponse.json({
    ok: true,
    count,
    message: `Thanks — ${info?.city ?? zip} is on the coverage wishlist (${count} request${count === 1 ? "" : "s"}).`,
  });
}
