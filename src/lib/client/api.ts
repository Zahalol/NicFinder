// Safe fetch wrapper for client components. It NEVER throws: network
// failures and non-JSON error bodies (proxy HTML pages, 413s) come back as
// a structured result, so busy flags can always be cleared in one place and
// every failure has a user-displayable message. (A bare `await fetch` that
// rejects used to leave buttons permanently disabled.)

export interface ApiResult {
  ok: boolean;
  /** HTTP status, or 0 when the request never completed (network error). */
  status: number;
  /** User-displayable message when !ok. */
  error: string | null;
  data: Record<string, unknown>;
}

export async function apiFetch(
  url: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: opts.method ?? "POST",
      ...(opts.body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts.body),
          }
        : {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok
        ? null
        : String(data.error ?? `Request failed (${res.status}).`),
      data,
    };
  } catch {
    return { ok: false, status: 0, error: "Network error — try again.", data: {} };
  }
}
