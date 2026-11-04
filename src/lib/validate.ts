// Small input validators shared by API routes (unit tested).

/**
 * Parse an optional quantity from untrusted input.
 * Returns:
 *  - null when absent/empty (quantity not supplied — allowed),
 *  - the integer when it is a whole number within [min, max],
 *  - undefined when present but invalid (caller should 400).
 */
export function parseOptionalQty(
  input: unknown,
  { min = 1, max = 100 }: { min?: number; max?: number } = {}
): number | null | undefined {
  if (input === undefined || input === null || input === "") return null;
  const q = Number(input);
  if (!Number.isInteger(q) || q < min || q > max) return undefined;
  return q;
}
