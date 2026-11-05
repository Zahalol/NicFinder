import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines } from "./helpers";
import {
  reportDeal,
  publishDealReport,
  rejectDealReport,
  DEAL_REP,
} from "@/lib/deal-reports";

async function fixtures() {
  const { zyn } = await seedProductLines();
  const store = await prisma.store.create({ data: { name: "Deal Store", isDemo: true } });
  const reporter = await prisma.user.create({
    data: { email: "dealer@test.local", displayName: "Dealer" },
  });
  const mod = await prisma.user.create({
    data: { email: "mod@test.local", displayName: "Mod", role: "MODERATOR" },
  });
  return { zyn, store, reporter, mod };
}

describe("community deal reports", () => {
  beforeEach(resetDb);

  it("validates structure: qty >= 2, price XOR discount, sane amounts", async () => {
    const { zyn, store, reporter } = await fixtures();
    const base = { storeId: store.id, productLineId: zyn.id, userId: reporter.id };

    for (const bad of [
      { ...base, minQty: 1, dealDiscount: "1.00", dealPrice: null },
      { ...base, minQty: 5, dealPrice: null, dealDiscount: null },
      { ...base, minQty: 5, dealPrice: "5.99", dealDiscount: "1.00" },
      { ...base, minQty: 5, dealPrice: "99.99", dealDiscount: null },
      { ...base, minQty: 5, dealPrice: null, dealDiscount: "50.00" },
    ]) {
      const r = await reportDeal(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
    }

    const good = await reportDeal({ ...base, minQty: 5, dealPrice: null, dealDiscount: "1.00" });
    expect(good.ok).toBe(true);
    const c = await prisma.contribution.findFirst({ where: { kind: "REPORT_DEAL" } });
    expect(c!.status).toBe("PENDING");
    expect(JSON.parse(c!.proposedDealJson!)).toMatchObject({
      minQty: 5,
      discountPerCanCents: 100,
      pricePerCanCents: null,
    });
    // No deal exists until a moderator approves.
    expect(await prisma.quantityDeal.count()).toBe(0);

    const dupe = await reportDeal({ ...base, minQty: 3, dealPrice: "5.49", dealDiscount: null });
    expect(dupe.ok).toBe(false); // one open report per user per store+line
  });

  it("approval creates a COMMUNITY deal, supersedes same-qty deals, credits reporter", async () => {
    const { zyn, store, reporter, mod } = await fixtures();
    // existing import deal at the same qty
    await prisma.quantityDeal.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        minQty: 5,
        discountPerCanCents: 50,
        observedAt: new Date("2026-10-01"),
        sourceType: "IMPORT",
      },
    });
    const r = await reportDeal({
      storeId: store.id,
      productLineId: zyn.id,
      userId: reporter.id,
      minQty: 5,
      dealPrice: null,
      dealDiscount: "1.00",
      conditions: "loyalty card",
    });
    if (!r.ok) throw new Error("report failed");
    const pub = await publishDealReport(r.contributionId, mod.id);
    expect(pub.ok).toBe(true);

    const deals = await prisma.quantityDeal.findMany({ orderBy: { observedAt: "asc" } });
    expect(deals).toHaveLength(2); // append-only
    expect(deals[0].status).toBe("SUPERSEDED");
    expect(deals[1].sourceType).toBe("COMMUNITY");
    expect(deals[1].discountPerCanCents).toBe(100);
    expect(deals[1].appliesAboveMinQty).toBeNull(); // never extrapolated
    expect(deals[1].conditions).toBe("loyalty card");

    const u = await prisma.user.findUnique({ where: { id: reporter.id } });
    expect(u!.reputation).toBe(DEAL_REP.PUBLISHED);

    // Can't publish twice.
    expect((await publishDealReport(r.contributionId, mod.id)).ok).toBe(false);
  });

  it("rejection requires a reason, costs a little rep, creates no deal", async () => {
    const { zyn, store, reporter, mod } = await fixtures();
    const r = await reportDeal({
      storeId: store.id,
      productLineId: zyn.id,
      userId: reporter.id,
      minQty: 3,
      dealPrice: "5.49",
      dealDiscount: null,
    });
    if (!r.ok) throw new Error("report failed");

    expect((await rejectDealReport(r.contributionId, mod.id, "")).ok).toBe(false);
    expect((await rejectDealReport(r.contributionId, mod.id, "No such deal at this store")).ok).toBe(true);
    expect(await prisma.quantityDeal.count()).toBe(0);
    const u = await prisma.user.findUnique({ where: { id: reporter.id } });
    expect(u!.reputation).toBe(DEAL_REP.REJECTED);
  });
});
