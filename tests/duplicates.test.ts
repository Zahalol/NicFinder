import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./helpers";
import { scanForDuplicates } from "@/lib/duplicates";

describe("catalog-wide duplicate scan", () => {
  beforeEach(resetDb);

  it("finds same-address, shared-phone, and near+similar-name pairs with scores", async () => {
    await prisma.store.createMany({
      data: [
        // same normalized address
        { name: "Shell", address: "100 W Main St", latitude: 41.9, longitude: -87.65 },
        { name: "Shell Gas", address: "100 W. Main Street", latitude: 41.93, longitude: -87.7 },
        // shared phone (2 stores)
        { name: "BP East", phone: "+13125550000", latitude: 41.8, longitude: -87.6 },
        { name: "BP West", phone: "+13125550000", latitude: 41.85, longitude: -87.8 },
        // ~60m apart, similar names
        { name: "Corner Quick Mart", latitude: 41.7, longitude: -87.62 },
        { name: "Quick Mart Corner Store", latitude: 41.7005, longitude: -87.62 },
        // control: nearby but totally different name
        { name: "Dentist Office", latitude: 41.70051, longitude: -87.62 },
      ],
    });

    const result = await scanForDuplicates();
    expect(result.scannedStores).toBe(7);

    const candidates = await prisma.duplicateCandidate.findMany({
      include: { storeA: true, storeB: true },
    });
    const reasons = candidates.map((c) => c.reason);
    expect(reasons.some((r) => /address/i.test(r))).toBe(true);
    expect(reasons.some((r) => /phone/i.test(r))).toBe(true);
    expect(reasons.some((r) => /similar names|identical names/i.test(r))).toBe(true);

    // The dentist is not flagged against the quick marts.
    for (const c of candidates) {
      expect([c.storeA.name, c.storeB.name]).not.toContain("Dentist Office");
    }
    for (const c of candidates) {
      expect(c.score).toBeGreaterThan(0);
      expect(c.score).toBeLessThanOrEqual(1);
      expect(c.storeAId < c.storeBId).toBe(true); // sorted pair invariant
    }
  });

  it("is idempotent and never re-opens dismissed pairs", async () => {
    await prisma.store.createMany({
      data: [
        { name: "Dup A", address: "1 Same St" },
        { name: "Dup B", address: "1 Same St" },
      ],
    });
    const first = await scanForDuplicates();
    expect(first.candidatesCreated).toBe(1);

    const again = await scanForDuplicates();
    expect(again.candidatesCreated).toBe(0);

    // Moderator dismisses; rescans must respect that decision.
    const c = await prisma.duplicateCandidate.findFirstOrThrow();
    await prisma.duplicateCandidate.update({
      where: { id: c.id },
      data: { status: "DISMISSED" },
    });
    const after = await scanForDuplicates();
    expect(after.candidatesCreated).toBe(0);
    expect(await prisma.duplicateCandidate.count()).toBe(1);
  });

  it("skips widely shared phone numbers (corporate lines)", async () => {
    await prisma.store.createMany({
      data: [0, 1, 2, 3].map((i) => ({
        name: `Chain Store ${i}`,
        phone: "+18005551234",
        latitude: 41 + i,
        longitude: -87,
      })),
    });
    const r = await scanForDuplicates();
    expect(r.candidatesCreated).toBe(0);
  });
});
