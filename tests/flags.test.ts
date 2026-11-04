import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines } from "./helpers";
import {
  flagObservation,
  upholdFlag,
  dismissFlag,
  flagDeal,
  upholdDealFlag,
  dismissDealFlag,
  FLAG_REP,
} from "@/lib/flags";

async function fixtures() {
  const { zyn } = await seedProductLines();
  const store = await prisma.store.create({ data: { name: "Flag Store", isDemo: true } });
  const flagger = await prisma.user.create({
    data: { email: "flagger@test.local", displayName: "Flagger" },
  });
  const moderator = await prisma.user.create({
    data: { email: "mod@test.local", displayName: "Mod", role: "MODERATOR" },
  });
  const historical = await prisma.priceObservation.create({
    data: {
      storeId: store.id,
      productLineId: zyn.id,
      priceCents: 9999,
      observedAt: new Date("2026-10-01T12:00:00Z"),
      sourceType: "IMPORT",
      status: "SUPERSEDED", // historical — the old flow couldn't dispute this
    },
  });
  return { zyn, store, flagger, moderator, historical };
}

describe("historical-observation flags", () => {
  beforeEach(resetDb);

  it("flags a historical (SUPERSEDED) observation for review", async () => {
    const { store, flagger, historical } = await fixtures();
    const r = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "That $99.99 import was a typo",
    });
    expect(r.ok).toBe(true);
    const c = await prisma.contribution.findFirst({ where: { kind: "FLAG_OBSERVATION" } });
    expect(c!.status).toBe("PENDING");
    expect(c!.targetObservationId).toBe(historical.id);
    expect(c!.productLineId).toBe(historical.productLineId);
  });

  it("rejects duplicate flags, short reasons, and wrong-store observations", async () => {
    const { store, flagger, historical } = await fixtures();
    const short = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "bad",
    });
    expect(short.ok).toBe(false);

    const first = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "clearly a typo",
    });
    expect(first.ok).toBe(true);
    const dupe = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "clearly a typo again",
    });
    expect(dupe.ok).toBe(false);
    if (!dupe.ok) expect(dupe.status).toBe(409);

    const otherStore = await prisma.store.create({ data: { name: "Other" } });
    const wrongStore = await flagObservation({
      observationId: historical.id,
      storeId: otherStore.id,
      userId: flagger.id,
      reason: "cross-store reference",
    });
    expect(wrongStore.ok).toBe(false);
    if (!wrongStore.ok) expect(wrongStore.status).toBe(404);
  });

  it("upholding invalidates (append-only) with provenance and credits the flagger", async () => {
    const { store, flagger, moderator, historical } = await fixtures();
    const r = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "price never existed",
    });
    if (!r.ok) throw new Error("flag failed");

    const up = await upholdFlag(r.contributionId, moderator.id, "import row confirmed bad");
    expect(up.ok).toBe(true);

    const obs = await prisma.priceObservation.findUnique({ where: { id: historical.id } });
    expect(obs!.status).toBe("INVALIDATED"); // never deleted
    expect(obs!.invalidReason).toContain("price never existed");
    expect(obs!.invalidReason).toContain("import row confirmed bad");

    const c = await prisma.contribution.findUnique({ where: { id: r.contributionId } });
    expect(c!.status).toBe("PUBLISHED");
    expect(c!.reviewedById).toBe(moderator.id);

    const u = await prisma.user.findUnique({ where: { id: flagger.id } });
    expect(u!.reputation).toBe(FLAG_REP.UPHELD);

    const mod = await prisma.moderationAction.findFirst({ where: { action: "UPHOLD_FLAG" } });
    expect(mod).not.toBeNull();

    // Can't re-resolve.
    const again = await upholdFlag(r.contributionId, moderator.id);
    expect(again.ok).toBe(false);
  });

  it("dismissing requires a reason, costs the flagger a little, leaves the observation", async () => {
    const { store, flagger, moderator, historical } = await fixtures();
    const r = await flagObservation({
      observationId: historical.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "I disagree with this",
    });
    if (!r.ok) throw new Error("flag failed");

    const noReason = await dismissFlag(r.contributionId, moderator.id, "");
    expect(noReason.ok).toBe(false);

    const d = await dismissFlag(r.contributionId, moderator.id, "Price verified correct");
    expect(d.ok).toBe(true);

    const obs = await prisma.priceObservation.findUnique({ where: { id: historical.id } });
    expect(obs!.status).toBe("SUPERSEDED"); // untouched
    const u = await prisma.user.findUnique({ where: { id: flagger.id } });
    expect(u!.reputation).toBe(FLAG_REP.DISMISSED);
  });

  it("cannot flag your own community report or an invalidated observation", async () => {
    const { zyn, store, flagger } = await fixtures();
    const own = await prisma.contribution.create({
      data: {
        userId: flagger.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 649,
        status: "PUBLISHED",
      },
    });
    const ownObs = await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 649,
        observedAt: new Date(),
        sourceType: "COMMUNITY",
        contributionId: own.id,
      },
    });
    const selfFlag = await flagObservation({
      observationId: ownObs.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "I made a mistake here",
    });
    expect(selfFlag.ok).toBe(false);
    if (!selfFlag.ok) expect(selfFlag.status).toBe(400);

    const dead = await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 500,
        observedAt: new Date(),
        sourceType: "IMPORT",
        status: "INVALIDATED",
      },
    });
    const deadFlag = await flagObservation({
      observationId: dead.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "this is already wrong",
    });
    expect(deadFlag.ok).toBe(false);
    if (!deadFlag.ok) expect(deadFlag.status).toBe(409);
  });
});

describe("deal flags", () => {
  beforeEach(resetDb);

  async function dealFixtures() {
    const { zyn, store, flagger, moderator } = await (async () => {
      const { zyn } = await seedProductLines();
      const store = await prisma.store.create({ data: { name: "Deal Flag Store", isDemo: true } });
      const flagger = await prisma.user.create({
        data: { email: "df@test.local", displayName: "DF" },
      });
      const moderator = await prisma.user.create({
        data: { email: "dfmod@test.local", displayName: "DFMod", role: "MODERATOR" },
      });
      return { zyn, store, flagger, moderator };
    })();
    const deal = await prisma.quantityDeal.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        minQty: 5,
        discountPerCanCents: 100,
        observedAt: new Date(),
        sourceType: "IMPORT",
      },
    });
    return { zyn, store, flagger, moderator, deal };
  }

  it("flag -> uphold as ended marks the deal EXPIRED and credits the flagger", async () => {
    const { store, flagger, moderator, deal } = await dealFixtures();
    const r = await flagDeal({
      dealId: deal.id,
      storeId: store.id,
      userId: flagger.id,
      reason: "clerk says the 5-can deal ended last week",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("flag failed");

    const up = await upholdDealFlag(r.contributionId, moderator.id, "ended");
    expect(up.ok).toBe(true);
    const d = await prisma.quantityDeal.findUnique({ where: { id: deal.id } });
    expect(d!.status).toBe("EXPIRED"); // existed, now over — not invalidated
    const u = await prisma.user.findUnique({ where: { id: flagger.id } });
    expect(u!.reputation).toBe(FLAG_REP.UPHELD);
    // flagger got a resolution notice
    expect(
      await prisma.notification.count({ where: { userId: flagger.id, kind: "REPORT_RESOLVED" } })
    ).toBe(1);
  });

  it("uphold as invalid marks INVALIDATED; dismiss leaves the deal and costs rep", async () => {
    const { zyn, store, flagger, moderator, deal } = await dealFixtures();
    const r1 = await flagDeal({
      dealId: deal.id, storeId: store.id, userId: flagger.id, reason: "never existed",
    });
    if (!r1.ok) throw new Error("flag failed");
    await upholdDealFlag(r1.contributionId, moderator.id, "invalid");
    expect((await prisma.quantityDeal.findUnique({ where: { id: deal.id } }))!.status).toBe("INVALIDATED");

    // second deal, dismissed flag
    const deal2 = await prisma.quantityDeal.create({
      data: {
        storeId: store.id, productLineId: zyn.id, minQty: 3,
        pricePerCanCents: 549, observedAt: new Date(), sourceType: "IMPORT",
      },
    });
    const other = await prisma.user.create({ data: { email: "o2@test.local", displayName: "O2" } });
    const r2 = await flagDeal({
      dealId: deal2.id, storeId: store.id, userId: other.id, reason: "I think it's fake",
    });
    if (!r2.ok) throw new Error("flag failed");
    expect((await dismissDealFlag(r2.contributionId, moderator.id, "")).ok).toBe(false);
    expect((await dismissDealFlag(r2.contributionId, moderator.id, "Deal verified in person")).ok).toBe(true);
    expect((await prisma.quantityDeal.findUnique({ where: { id: deal2.id } }))!.status).toBe("ACTIVE");
    const u = await prisma.user.findUnique({ where: { id: other.id } });
    expect(u!.reputation).toBe(FLAG_REP.DISMISSED);
  });

  it("rejects duplicate flags and flags on inactive deals", async () => {
    const { store, flagger, deal } = await dealFixtures();
    await prisma.quantityDeal.update({ where: { id: deal.id }, data: { status: "EXPIRED" } });
    const dead = await flagDeal({
      dealId: deal.id, storeId: store.id, userId: flagger.id, reason: "already gone",
    });
    expect(dead.ok).toBe(false);
    if (!dead.ok) expect(dead.status).toBe(409);
  });
});
