import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines, makeUser } from "./helpers";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  decideDispute,
  publishDispute,
  maybePublishCorroborated,
  confirmationWeight,
} from "@/lib/reputation";
import { hashPassword, verifyPassword, createSession, getUserByToken } from "@/lib/auth";

const S = DEFAULT_SETTINGS;
const now = new Date("2026-11-04T12:00:00Z");

describe("decideDispute — publication policy (acceptance 10, 11)", () => {
  const base = {
    userReputation: 0,
    userCreatedAt: new Date(now.getTime() - 30 * 86400_000),
    currentPriceCents: 649,
    settings: S,
    now,
  };

  it("new users never unilaterally change prices", () => {
    expect(decideDispute({ ...base, proposedPriceCents: 699 }).action).toBe("CORROBORATE");
  });

  it("trusted users auto-publish within guardrails", () => {
    expect(
      decideDispute({ ...base, userReputation: S.trustedReputation, proposedPriceCents: 699 }).action
    ).toBe("AUTO_PUBLISH");
  });

  it("brand-new trusted-rep accounts still cannot auto-publish (age check)", () => {
    expect(
      decideDispute({
        ...base,
        userReputation: 100,
        userCreatedAt: new Date(now.getTime() - 1 * 86400_000),
        proposedPriceCents: 699,
      }).action
    ).toBe("CORROBORATE");
  });

  it("drastic changes go to review even for trusted users", () => {
    expect(
      decideDispute({ ...base, userReputation: 100, proposedPriceCents: 1500 }).action
    ).toBe("REVIEW"); // +131% > 50%
  });

  it("insane prices always go to review", () => {
    expect(decideDispute({ ...base, userReputation: 100, proposedPriceCents: 50 }).action).toBe("REVIEW");
    expect(decideDispute({ ...base, userReputation: 100, proposedPriceCents: 9000 }).action).toBe("REVIEW");
  });

  it("no current price: trusted publishes sane values, newbies corroborate", () => {
    const noCurrent = { ...base, currentPriceCents: null };
    expect(decideDispute({ ...noCurrent, userReputation: 100, proposedPriceCents: 650 }).action).toBe("AUTO_PUBLISH");
    expect(decideDispute({ ...noCurrent, proposedPriceCents: 650 }).action).toBe("CORROBORATE");
  });
});

describe("confirmation weight decay", () => {
  it("halves at the half-life", () => {
    const created = new Date(now.getTime() - S.confirmationHalfLifeDays * 86400_000);
    expect(confirmationWeight(created, S.confirmationHalfLifeDays, now)).toBeCloseTo(0.5, 5);
    expect(confirmationWeight(now, S.confirmationHalfLifeDays, now)).toBe(1);
  });
});

describe("corroboration & publication flows (acceptance 10, 11)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function setupStoreWithPrice() {
    const { zyn } = await seedProductLines();
    const store = await prisma.store.create({ data: { name: "T-Store" } });
    const obs = await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 649,
        observedAt: new Date(),
        sourceType: "IMPORT",
      },
    });
    return { zyn, store, obs };
  }

  it("publishes a proposal only after enough INDEPENDENT corroborators", async () => {
    const { zyn, store, obs } = await setupStoreWithPrice();
    const proposer = await makeUser({ email: "p@x.com" });
    const c1 = await makeUser({ email: "c1@x.com" });

    const proposal = await prisma.contribution.create({
      data: {
        userId: proposer.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 699,
        status: "CORROBORATING",
      },
    });

    // Proposer "corroborating" themselves must not count.
    await prisma.contribution.create({
      data: {
        userId: proposer.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "CONFIRM",
        targetObservationId: proposal.id,
        status: "PUBLISHED",
      },
    });
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("pending");

    // One independent corroborator (threshold is 2): still unpublished.
    await prisma.contribution.create({
      data: {
        userId: c1.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "CONFIRM",
        targetObservationId: proposal.id,
        status: "PUBLISHED",
      },
    });
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("pending");

    // Duplicate submission by the SAME corroborator must not help (acceptance 11).
    await prisma.contribution.create({
      data: {
        userId: c1.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "CONFIRM",
        targetObservationId: proposal.id,
        status: "PUBLISHED",
      },
    });
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("pending");

    // Second independent corroborator → publish.
    const c2 = await makeUser({ email: "c2@x.com" });
    await prisma.contribution.create({
      data: {
        userId: c2.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "CONFIRM",
        targetObservationId: proposal.id,
        status: "PUBLISHED",
      },
    });
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("published");

    // Old observation superseded; new COMMUNITY observation active; rep awarded.
    const oldObs = await prisma.priceObservation.findUnique({ where: { id: obs.id } });
    expect(oldObs!.status).toBe("SUPERSEDED");
    const active = await prisma.priceObservation.findFirst({
      where: { storeId: store.id, status: "ACTIVE" },
    });
    expect(active!.priceCents).toBe(699);
    expect(active!.sourceType).toBe("COMMUNITY");
    const proposerAfter = await prisma.user.findUnique({ where: { id: proposer.id } });
    expect(proposerAfter!.reputation).toBe(5);
  });

  it("publishing penalizes recent confirmers of the replaced (wrong) price", async () => {
    const { zyn, store, obs } = await setupStoreWithPrice();
    const confirmer = await makeUser({ email: "confirmer@x.com", reputation: 10 });
    await prisma.verification.create({
      data: { observationId: obs.id, userId: confirmer.id, verdict: "CONFIRM" },
    });
    const trusted = await makeUser({ email: "trusted@x.com", reputation: 80, createdDaysAgo: 100 });
    const contribution = await prisma.contribution.create({
      data: {
        userId: trusted.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 699,
        status: "PENDING",
      },
    });
    await publishDispute(contribution.id, "auto");

    const after = await prisma.user.findUnique({ where: { id: confirmer.id } });
    expect(after!.reputation).toBe(7); // 10 - 3 stale-confirm penalty
    const events = await prisma.reputationEvent.findMany({ where: { userId: confirmer.id } });
    expect(events.some((e) => e.reason === "CONFIRM_INACCURATE")).toBe(true);
  });
});

describe("auth primitives (acceptance 9 plumbing)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("password hash roundtrip; wrong password rejected", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(hash).not.toContain("correct");
  });

  it("session tokens are stored hashed and expire", async () => {
    const user = await makeUser({ email: "s@x.com" });
    const { token } = await createSession(user.id);
    expect(await getUserByToken(token)).toMatchObject({ id: user.id });
    // Raw token is never stored.
    const sessions = await prisma.authSession.findMany();
    expect(sessions[0].tokenHash).not.toBe(token);
    // Expired session is rejected and cleaned up.
    await prisma.authSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getUserByToken(token)).toBeNull();
  });

  it("suspended users cannot authenticate", async () => {
    const user = await makeUser({ email: "sus@x.com" });
    const { token } = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    expect(await getUserByToken(token)).toBeNull();
  });
});

describe("corroboration network independence (anti-sockpuppet)", () => {
  beforeEach(resetDb);

  it("same-IP corroborators count once; proposer's own network never counts", async () => {
    const { zyn } = await seedProductLines();
    const store = await prisma.store.create({ data: { name: "Indep Store", isDemo: true } });
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 649,
        observedAt: new Date(),
        sourceType: "ADMIN",
      },
    });
    const proposer = await makeUser({ email: "p2@x.com" });
    const a = await makeUser({ email: "a@x.com" });
    const b = await makeUser({ email: "b@x.com" });
    const c = await makeUser({ email: "c@x.com" });
    const HASH_SHARED = "hash-shared-network";
    const HASH_PROPOSER = "hash-proposer-network";

    const proposal = await prisma.contribution.create({
      data: {
        userId: proposer.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 699,
        status: "CORROBORATING",
        ipHash: HASH_PROPOSER,
      },
    });
    const corroborate = (userId: string, ipHash: string | null) =>
      prisma.contribution.create({
        data: {
          userId,
          storeId: store.id,
          productLineId: zyn.id,
          kind: "CONFIRM",
          targetObservationId: proposal.id,
          status: "PUBLISHED",
          ipHash,
        },
      });

    // Two different accounts from the SAME network: count once (threshold 2).
    await corroborate(a.id, HASH_SHARED);
    await corroborate(b.id, HASH_SHARED);
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("pending");

    // An account on the PROPOSER'S network doesn't count either.
    await corroborate(c.id, HASH_PROPOSER);
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("pending");

    // A genuinely distinct network completes the threshold.
    const d = await makeUser({ email: "d@x.com" });
    await corroborate(d.id, "hash-other-network");
    expect(await maybePublishCorroborated(proposal.id, S)).toBe("published");
  });
});

describe("stableIpHash", () => {
  it("returns null for unknown/local origins (never a constant bucket)", async () => {
    const { stableIpHash } = await import("@/lib/auth");
    expect(stableIpHash(null)).toBeNull();
    expect(stableIpHash(undefined)).toBeNull();
    expect(stableIpHash("")).toBeNull();
    expect(stableIpHash("local")).toBeNull();
    const a = stableIpHash("203.0.113.5");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(stableIpHash("203.0.113.5")).toBe(a); // stable
    expect(stableIpHash("203.0.113.6")).not.toBe(a);
  });
});

describe("variant detail on community price reports", () => {
  beforeEach(resetDb);

  it("publishDispute carries strength/flavor onto the published observation", async () => {
    const { zyn } = await seedProductLines();
    const store = await prisma.store.create({ data: { name: "Variant Store", isDemo: true } });
    const u = await makeUser({ email: "variant@x.com" });
    const c = await prisma.contribution.create({
      data: {
        userId: u.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 649,
        proposedStrength: "6mg",
        proposedFlavor: "Wintergreen",
        status: "CORROBORATING",
      },
    });
    await publishDispute(c.id, "moderator", undefined);
    const obs = await prisma.priceObservation.findFirst({
      where: { contributionId: c.id },
    });
    expect(obs!.strength).toBe("6mg");
    expect(obs!.flavor).toBe("Wintergreen");
    expect(obs!.sourceType).toBe("COMMUNITY");
  });
});
