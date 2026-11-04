// Small input validators shared by API routes (unit tested).

/**
 * Parse an optional quantity from untrusted input.
 * Returns:
 *  - null when absent/empty (quantity not supplied — allowed),
 *  - the integer when it is a whole number within [min, max],
 *  - undefined when present but invalid (caller should 400).
 */
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
