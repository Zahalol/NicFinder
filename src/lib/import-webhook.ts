// Outbound status webhook for import batches (the push half of the
// automated-import handoff). Disabled unless IMPORT_WEBHOOK_URL is set —
// the app initiates NO external calls by default.
//
// Best-effort and fire-safe: a webhook failure never fails the import.
// Payloads carry batch status + counts only — no row contents, no secrets.
// Deliveries are signed with IMPORT_API_KEY (HMAC-SHA256 of the body in
// X-NicFinder-Signature) when that key is set, so the receiver can verify.

import { createHmac } from "node:crypto";

export interface ImportWebhookPayload {
  event: "import.committed" | "import.reversed";
  batchId: string;
  filename?: string;
  counts?: Record<string, number>;
  reason?: string;
  at: string;
}

export async function sendImportWebhook(payload: ImportWebhookPayload): Promise<void> {
  const url = process.env.IMPORT_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return; // disabled (https only)
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.IMPORT_API_KEY;
  if (key) {
    headers["X-NicFinder-Signature"] =
      "sha256=" + createHmac("sha256", key).update(body).digest("hex");
  }
  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("import webhook delivery failed (ignored)", e);
  }
}
