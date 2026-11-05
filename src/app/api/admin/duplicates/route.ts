// Run a catalog-wide duplicate scan on demand (also run by maintenance).
import { NextResponse } from "next/server";
import { withStaff } from "@/lib/admin-api";
import { scanForDuplicates } from "@/lib/duplicates";
import { audit } from "@/lib/audit";

export async function POST() {
  return withStaff(async (user) => {
    const result = await scanForDuplicates();
    await audit("DUPLICATE_SCAN", {
      userId: user.id,
      targetType: "store",
      targetId: "catalog",
      detail: result as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ ok: true, ...result });
  });
}
