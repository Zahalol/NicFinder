// Bearer-key auth for the automated import API. The endpoint is disabled
// entirely (null → 404) when IMPORT_API_KEY is unset or too short.
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function importApiKeyOk(req: NextRequest): boolean | null {
  const key = process.env.IMPORT_API_KEY;
  if (!key || key.length < 16) return null;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
