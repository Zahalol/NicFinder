import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines } from "./helpers";
import {
  notifyPriceChange,
  unreadCount,
  markAllRead,
  maybeNotifyCoverageArrived,
  zipHasPricedStore,
} from "@/lib/notifications";
import { publishDispute } from "@/lib/reputation";

async function fixtures() {
  const { zyn } = await seedProductLines();
  const store = await prisma.store.create({ data: { name: "Watched Store", isDemo: true } });
  const watcher = await prisma.user.create({
    data: { email: "watcher@test.local", displayName: "Watcher" },
  });
  const other = await prisma.user.create({
    data: { email: "other@test.local", displayName: "Other" },
  });
  await prisma.savedStore.create({ data: { userId: watcher.id, storeId: store.id } });
  return { zyn, store, watcher, other };
}

describe("in-app price-watch notifications", () => {
  beforeEach(resetDb);

  it("notifies watchers of a price change, excluding the actor", async () => {
    const { zyn, store, watcher, other } = await fixtures();
    await prisma.savedStore.create({ data: { userId: other.id, storeId: store.id } });

    const created = await notifyPriceChange({
      storeId: store.id,
      storeName: store.name,
      productLineName: "ZYN (regular)",
      newPriceCents: 599,
      previousPriceCents: 649,
      actorUserId: other.id, // the person who reported it
    });
    expect(created).toBe(1);
    expect(await unreadCount(watcher.id)).toBe(1);
    expect(await unreadCount(other.id)).toBe(0);

    const n = await prisma.notification.findFirst({ where: { userId: watcher.id } });
    expect(n!.title).toContain("down to $5.99");
    expect(n!.body).toContain("$6.49");
    expect(n!.url).toBe(`/stores/${store.id}`);
    expect(zyn).toBeTruthy();
  });

  it("collapses repeat changes into one unread alert (newest wins)", async () => {
    const { store, watcher } = await fixtures();
    const base = {
      storeId: store.id,
      storeName: store.name,
      productLineName: "ZYN (regular)",
    };
    await notifyPriceChange({ ...base, newPriceCents: 599, previousPriceCents: 649 });
    await notifyPriceChange({ ...base, newPriceCents: 579, previousPriceCents: 599 });
    expect(await unreadCount(watcher.id)).toBe(1);
    const n = await prisma.notification.findFirst({ where: { userId: watcher.id } });
    expect(n!.title).toContain("$5.79");
  });

  it("no notification when the price did not change or is null", async () => {
    const { store, watcher } = await fixtures();
    const base = {
      storeId: store.id,
      storeName: store.name,
      productLineName: "ZYN (regular)",
    };
    await notifyPriceChange({ ...base, newPriceCents: 649, previousPriceCents: 649 });
    await notifyPriceChange({ ...base, newPriceCents: null, previousPriceCents: 649 });
    expect(await unreadCount(watcher.id)).toBe(0);
  });

  it("markAllRead clears the badge; read alerts don't collapse new ones", async () => {
    const { store, watcher } = await fixtures();
    const base = {
      storeId: store.id,
      storeName: store.name,
      productLineName: "ZYN (regular)",
    };
    await notifyPriceChange({ ...base, newPriceCents: 599, previousPriceCents: 649 });
    expect(await markAllRead(watcher.id)).toBe(1);
    expect(await unreadCount(watcher.id)).toBe(0);

    await notifyPriceChange({ ...base, newPriceCents: 589, previousPriceCents: 599 });
    expect(await unreadCount(watcher.id)).toBe(1);
    expect(await prisma.notification.count({ where: { userId: watcher.id } })).toBe(2);
  });

  it("resolution notices: reporter learns their report was published (not on auto)", async () => {
    const { zyn, store, other } = await fixtures();
    const dispute = await prisma.contribution.create({
      data: {
        userId: other.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 599,
        status: "CORROBORATING",
      },
    });
    await publishDispute(dispute.id, "moderator", undefined);
    const resolved = await prisma.notification.findFirst({
      where: { userId: other.id, kind: "REPORT_RESOLVED" },
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.title).toContain("was published");

    // Trusted auto-publish does NOT notify the actor about their own action.
    const auto = await prisma.contribution.create({
      data: {
        userId: other.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 589,
        status: "PENDING",
      },
    });
    await publishDispute(auto.id, "auto");
    expect(
      await prisma.notification.count({ where: { userId: other.id, kind: "REPORT_RESOLVED" } })
    ).toBe(1);
  });

  it("publishDispute alerts watchers end-to-end", async () => {
    const { zyn, store, watcher, other } = await fixtures();
    // current price
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 649,
        observedAt: new Date(),
        sourceType: "ADMIN",
      },
    });
    const dispute = await prisma.contribution.create({
      data: {
        userId: other.id,
        storeId: store.id,
        productLineId: zyn.id,
        kind: "DISPUTE",
        proposedPriceCents: 599,
        status: "CORROBORATING",
      },
    });
    await publishDispute(dispute.id, "moderator", undefined);
    expect(await unreadCount(watcher.id)).toBe(1);
    const n = await prisma.notification.findFirst({ where: { userId: watcher.id } });
    expect(n!.title).toContain("Watched Store");
    expect(n!.title).toContain("down to $5.99");
  });
});

describe("coverage-arrived notifications", () => {
  beforeEach(resetDb);

  it("notifies signed-in requesters once when their ZIP gains its first price", async () => {
    const { zyn } = await seedProductLines();
    const requester = await prisma.user.create({
      data: { email: "req@test.local", displayName: "Requester" },
    });
    await prisma.coverageRequest.createMany({
      data: [
        { zip: "60699", userId: requester.id },
        { zip: "60699", userId: requester.id }, // duplicate request → one notice
        { zip: "60699" }, // guest request → no notice possible
      ],
    });
    const store = await prisma.store.create({
      data: { name: "First Priced", zip: "60699", isDemo: true },
    });

    // pre-check honest: no priced store yet
    expect(await zipHasPricedStore("60699")).toBe(false);
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 649,
        observedAt: new Date(),
        sourceType: "ADMIN",
      },
    });
    const created = await maybeNotifyCoverageArrived({
      zip: "60699",
      storeName: store.name,
      zipHadPricedStoreBefore: false,
    });
    expect(created).toBe(1);
    const n = await prisma.notification.findFirst({
      where: { userId: requester.id, kind: "COVERAGE_ARRIVED" },
    });
    expect(n!.title).toContain("60699");
    expect(n!.url).toBe("/zyn-prices/60699");

    // All requests for the zip marked notified → a second price never re-notifies.
    const again = await maybeNotifyCoverageArrived({
      zip: "60699",
      storeName: store.name,
      zipHadPricedStoreBefore: false,
    });
    expect(again).toBe(0);
    // And the pre-check now answers true, guarding the normal path.
    expect(await zipHasPricedStore("60699")).toBe(true);
  });

  it("never notifies when the ZIP already had a priced store", async () => {
    await seedProductLines();
    const requester = await prisma.user.create({
      data: { email: "req2@test.local", displayName: "R2" },
    });
    await prisma.coverageRequest.create({ data: { zip: "60698", userId: requester.id } });
    const created = await maybeNotifyCoverageArrived({
      zip: "60698",
      storeName: "Any",
      zipHadPricedStoreBefore: true,
    });
    expect(created).toBe(0);
    expect(await unreadCount(requester.id)).toBe(0);
  });
});
