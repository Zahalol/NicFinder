// Health check for deployment platforms (Replit Autoscale probes, uptime
// monitors). Verifies the database connection.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { ok: false, db: "down", time: new Date().toISOString() },
      { status: 503 }
    );
  }
}
