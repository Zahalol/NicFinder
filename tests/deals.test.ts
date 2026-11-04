import { describe, it, expect } from "vitest";
import { effectivePerCanCents, totalCents, type DealInput } from "@/lib/deals";

const DEAL_DISCOUNT: DealInput = {
  minQty: 5,
  pricePerCanCents: null,
  discountPerCanCents: 100,
  appliesAboveMinQty: true,
};

describe("quantity deal math — acceptance test 5", () => {
  it("'5 cans, $1 off each' does NOT affect the single-can price", () => {
    const r = effectivePerCanCents(649, DEAL_DISCOUNT, 1);
    expect(r.perCanCents).toBe(649);
    expect(r.usedDeal).toBe(false);
  });

  it("applies at exactly minQty", () => {
    const r = effectivePerCanCents(649, DEAL_DISCOUNT, 5);
    expect(r.perCanCents).toBe(549);
    expect(r.usedDeal).toBe(true);
    expect(totalCents(649, DEAL_DISCOUNT, 5)).toBe(2745);
  });

  it("applies above minQty when terms say so", () => {
    const r = effectivePerCanCents(649, DEAL_DISCOUNT, 10);
    expect(r.perCanCents).toBe(549);
    expect(totalCents(649, DEAL_DISCOUNT, 10)).toBe(5490);
  });

  it("blends when deal covers only the first minQty cans", () => {
    const deal: DealInput = { ...DEAL_DISCOUNT, appliesAboveMinQty: false };
    // 5×5.49 + 2×6.49 = 27.45 + 12.98 = 40.43 → per can 577.57 → 578
    expect(totalCents(649, deal, 7)).toBe(4043);
    const r = effectivePerCanCents(649, deal, 7);
    expect(r.perCanCents).toBe(578);
    expect(r.usedDeal).toBe(true);
  });

  it("does NOT extrapolate when terms above minQty are unknown", () => {
    const deal: DealInput = { ...DEAL_DISCOUNT, appliesAboveMinQty: null };
    const r = effectivePerCanCents(649, deal, 10);
    expect(r.perCanCents).toBeNull();
    expect(r.uncertain).toBe(true);
  });

  it("explicit per-can deal price wins over discount derivation", () => {
    const deal: DealInput = {
      minQty: 3,
      pricePerCanCents: 599,
      discountPerCanCents: null,
      appliesAboveMinQty: true,
    };
    expect(effectivePerCanCents(729, deal, 3).perCanCents).toBe(599);
  });

  it("deal with unknown regular price and only a discount is unusable", () => {
    const r = effectivePerCanCents(null, DEAL_DISCOUNT, 5);
    expect(r.perCanCents).toBeNull();
    expect(r.uncertain).toBe(true);
  });

  it("qty below minQty uses regular price", () => {
    expect(effectivePerCanCents(649, DEAL_DISCOUNT, 4).perCanCents).toBe(649);
  });
});
