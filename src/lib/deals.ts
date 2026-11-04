// Quantity-deal math. A deal is "buy >= minQty cans" and either an explicit
// per-can price or a per-can discount off the regular price.

export interface DealInput {
  minQty: number;
  pricePerCanCents: number | null;
  discountPerCanCents: number | null;
  appliesAboveMinQty: boolean | null; // null = unknown
}

/**
 * Effective per-can price when buying `qty` cans, given the regular price.
 * Returns null when the deal cannot be applied or inputs are incoherent.
 *
 * Rules:
 * - qty < minQty → deal does not apply (regular price).
 * - qty == minQty → deal applies.
 * - qty > minQty → applies only when appliesAboveMinQty is true; when
 *   unknown (null) we conservatively price the qty at minQty-deal for the
 *   first minQty cans ONLY if appliesAboveMinQty is true; otherwise we do
 *   not extrapolate — caller should show "terms unknown above N".
 */
export function effectivePerCanCents(
  regularCents: number | null,
  deal: DealInput | null,
  qty: number
): { perCanCents: number | null; usedDeal: boolean; uncertain: boolean } {
  if (qty < 1) return { perCanCents: null, usedDeal: false, uncertain: false };
  if (!deal || qty < deal.minQty) {
    return { perCanCents: regularCents, usedDeal: false, uncertain: false };
  }

  const dealPerCan =
    deal.pricePerCanCents !== null
      ? deal.pricePerCanCents
      : regularCents !== null && deal.discountPerCanCents !== null
        ? regularCents - deal.discountPerCanCents
        : null;

  if (dealPerCan === null || dealPerCan < 0) {
    return { perCanCents: regularCents, usedDeal: false, uncertain: true };
  }

  if (qty === deal.minQty) {
    return { perCanCents: dealPerCan, usedDeal: true, uncertain: false };
  }

  // qty > minQty
  if (deal.appliesAboveMinQty === true) {
    return { perCanCents: dealPerCan, usedDeal: true, uncertain: false };
  }
  if (deal.appliesAboveMinQty === false) {
    // Deal covers exactly minQty cans; the rest at regular price.
    if (regularCents === null)
      return { perCanCents: null, usedDeal: true, uncertain: true };
    const total = dealPerCan * deal.minQty + regularCents * (qty - deal.minQty);
    return {
      perCanCents: Math.round(total / qty),
      usedDeal: true,
      uncertain: false,
    };
  }
  // Unknown terms above minQty: don't extrapolate.
  return { perCanCents: null, usedDeal: false, uncertain: true };
}

/** Total for qty cans; null when per-can is unknown. */
export function totalCents(
  regularCents: number | null,
  deal: DealInput | null,
  qty: number
): number | null {
  const { perCanCents, usedDeal } = effectivePerCanCents(regularCents, deal, qty);
  if (perCanCents === null) return null;
  // For the mixed case (appliesAboveMinQty === false) perCan was rounded; recompute exact.
  if (deal && usedDeal && deal.appliesAboveMinQty === false && qty > deal.minQty) {
    const dealPerCan =
      deal.pricePerCanCents ??
      (regularCents !== null && deal.discountPerCanCents !== null
        ? regularCents - deal.discountPerCanCents
        : null);
    if (dealPerCan === null || regularCents === null) return null;
    return dealPerCan * deal.minQty + regularCents * (qty - deal.minQty);
  }
  return perCanCents * qty;
}
