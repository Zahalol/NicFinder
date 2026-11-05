// Small input validators shared by API routes (unit tested).

/**
 * Parse an optional quantity from untrusted input.
 * Returns:
 *  - null when absent/empty (quantity not supplied — allowed),
 *  - the integer when it is a whole number within [min, max],
 *  - undefined when present but invalid (caller should 400).
 */
/**
 * Clean untrusted free text for storage: strips NUL bytes (Postgres `text`
 * rejects them → 500) and other control characters except newline/tab,
 * trims, and caps the length. Returns "" for non-string input.
 */
export function cleanText(input: unknown, maxLen: number): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Encode one CSV cell safely: quotes/commas/newlines are quoted, and a
 * leading = + - @ (or tab/CR) is neutralized with an apostrophe so values
 * from untrusted imports cannot execute as formulas when the exported
 * report is opened in Excel/Sheets (OWASP CSV-injection guidance).
 */
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parseOptionalQty(
  input: unknown,
  { min = 1, max = 100 }: { min?: number; max?: number } = {}
): number | null | undefined {
  if (input === undefined || input === null || input === "") return null;
  const q = Number(input);
  if (!Number.isInteger(q) || q < min || q > max) return undefined;
  return q;
}
