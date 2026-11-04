import { NextResponse, type NextRequest } from "next/server";
import { withAdmin } from "@/lib/admin-api";
import { getSettings, updateSettings, DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export async function GET() {
  return withAdmin(async () => NextResponse.json(await getSettings()));
}

export async function POST(req: NextRequest) {
  return withAdmin(async (user) => {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });

    const patch: Partial<AppSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      if (body[key] === undefined || body[key] === "") continue;
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0)
        return NextResponse.json({ error: `${key} must be a non-negative number.` }, { status: 400 });
      patch[key] = n;
    }
    if (patch.maxTrustedPriceChangeRatio !== undefined && patch.maxTrustedPriceChangeRatio > 5)
      return NextResponse.json({ error: "maxTrustedPriceChangeRatio must be ≤ 5." }, { status: 400 });

    const next = await updateSettings(patch);
    await audit("SETTINGS_CHANGED", { userId: user.id, detail: patch });
    return NextResponse.json(next);
  });
}
