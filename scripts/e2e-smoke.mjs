// End-to-end smoke test against a production build.
// Prereqs: `npm run build` and a migrated+seeded database (DATABASE_URL).
// Covers: age-gate overlay → search (best-price card, honest states) →
// store detail → watchlist → guest authz → coverage requests → SEO page →
// admin login → CSV import preview/commit → admin pages → health.
//
// Uses the environment's preinstalled Playwright/Chromium when available.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Playwright not available — install it (`npm i -D playwright`) or run in an environment that provides it."
  );
  process.exit(2);
}

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
let server;
let browser;

function check(name, cond, extra = "") {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not start in time");
}

try {
  // Fail fast if a stale server already holds the port (a previous run that
  // wasn't cleaned up) — testing against an old build gives false results.
  let portBusy = false;
  try {
    await fetch(BASE, { redirect: "manual", signal: AbortSignal.timeout(1500) });
    portBusy = true;
  } catch {}
  if (portBusy) {
    console.error(
      `Port ${PORT} is already in use — kill the stale server first (pkill -f "next start -p ${PORT}") and re-run.`
    );
    process.exit(2);
  }

  console.log("Starting production server…");
  // detached → own process group, so we can kill next-server too (killing
  // just the npx wrapper leaves the actual server running).
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: true,
  });
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
  await waitForServer(BASE);

  browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 1. Age gate overlay (content stays indexable underneath)
  console.log("Age gate overlay…");
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  const dialog = page.getByRole("dialog");
  check("21+ overlay shown on first visit", await dialog.isVisible());
  check(
    "page content still present behind the overlay (SEO-safe)",
    (await page.locator('a[href^="/stores/"]').count()) > 0
  );
  await page.getByRole("button", { name: /21 or older/i }).click();
  // The overlay hides as soon as the cookie POST succeeds; wait for it
  // rather than sleeping a fixed interval (cold servers can be slow).
  await page
    .waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, {
      timeout: 10_000,
    })
    .catch(() => {});
  check("overlay dismissed after confirming", (await page.getByRole("dialog").count()) === 0);

  // 2. Search results
  console.log("Search 60614…");
  const storeLinks = await page.locator('a[href^="/stores/"]').count();
  check("shows store cards", storeLinks > 0, `(found ${storeLinks})`);
  check("shows demo-data labeling", (await page.locator("text=demo data").count()) > 0);
  // Unpriced stores are grouped behind an expandable directory section; the
  // honest signal is the explicit "no reported price yet" summary + the
  // "No price yet" cards once expanded.
  const directoryToggle = page.locator("button", { hasText: /no reported price yet/ });
  check(
    "shows honest no-price directory summary",
    (await directoryToggle.count()) > 0
  );
  await directoryToggle.first().click();
  check(
    "expanding the directory reveals no-price cards",
    (await page.locator("text=No price yet").count()) > 0
  );
  check(
    "best-price-nearby card present",
    (await page.locator("text=Best price nearby").count()) > 0
  );

  await page.goto(`${BASE}/search?q=60614&sort=price&radius=5`);
  const firstText = await page.locator('a[href^="/stores/"]').nth(1).textContent(); // nth(0) is the hero card
  check("price sort puts a priced store first", /\$\d/.test(firstText ?? ""));

  await page.goto(`${BASE}/search?q=60614&product=zyn-ultra&radius=5`);
  const bodyText = await page.textContent("body");
  check(
    "Ultra view loads with its own (sparser) prices",
    bodyText.includes("no reported price yet") && bodyText.includes("$7.49")
  );

  // 2b. Session-2 UX features
  console.log("UX features…");
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  check(
    "confidence pills on priced cards",
    (await page.locator("text=High confidence").count()) > 0
  );
  // Compare flow: pick two stores → tray → dialog → Escape closes
  const compareBtns = page.locator("button", { hasText: "+ Compare" });
  check("compare toggles offered", (await compareBtns.count()) >= 2);
  await compareBtns.nth(0).click();
  await compareBtns.nth(0).click(); // next card (first now reads "Comparing")
  await page.locator("button", { hasText: /^Compare \(2\)$/ }).click();
  await page.waitForTimeout(400);
  check("compare dialog opens", (await page.getByRole("dialog").count()) > 0);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("compare dialog closes on Escape", (await page.getByRole("dialog").count()) === 0);

  await page.goto(`${BASE}/search?q=60614&qty=5&radius=5`);
  check(
    "worth-the-trip verdict at qty=5",
    (await page.locator("text=Worth the trip?").count()) > 0
  );

  await page.goto(`${BASE}/search?q=99999`);
  check(
    "ZIP typo recovery offers suggestions",
    (await page.locator("text=Did you mean").count()) > 0
  );

  await page.goto(`${BASE}/search?q=60435`); // Joliet: outside coverage, near Chicago
  check(
    "nearest covered area suggested when reachable",
    (await page.locator("text=Nearest covered area").count()) > 0
  );

  await page.goto(`${BASE}/price-drops`);
  const dropsBody = await page.textContent("body");
  check(
    "price-drops page lists a seeded drop",
    /Recent price drops/.test(dropsBody) && /cheaper/.test(dropsBody)
  );

  await page.goto(`${BASE}/about`);
  check(
    "about page explains the honesty system",
    (await page.locator("text=How NicFinder works").count()) > 0
  );

  const manifest = await page.evaluate(async () =>
    (await fetch("/manifest.webmanifest")).json()
  );
  check("web manifest served", manifest?.short_name === "NicFinder");
  const offlineStatus = await page.evaluate(async () => (await fetch("/offline")).status);
  check("offline fallback page served", offlineStatus === 200);

  // 3. Store detail + watchlist authz
  console.log("Store detail…");
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  await page.locator('a[href^="/stores/"]').nth(1).click();
  await page.waitForSelector("text=Price history");
  check("store page shows price history", true);
  const storeId = page.url().split("/stores/")[1]?.split("?")[0];

  const guestChecks = await page.evaluate(async (sid) => {
    const c = await fetch(`/api/stores/${sid}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "CONFIRM" }),
    });
    const s = await fetch(`/api/stores/${sid}/save`, { method: "POST" });
    const a = await fetch("/api/admin/settings");
    const h = await fetch("/api/health");
    return { contribution: c.status, save: s.status, admin: a.status, health: h.status };
  }, storeId);
  check("guest contribution POST rejected with 401", guestChecks.contribution === 401);
  check("guest save-store POST rejected with 401", guestChecks.save === 401);
  check("guest admin API rejected with 401", guestChecks.admin === 401);
  check("health endpoint ok", guestChecks.health === 200);
  await page.goto(`${BASE}/admin`);
  check("guest /admin redirects to login", page.url().includes("/login"));

  // 4. Coverage request on an uncovered area
  console.log("Coverage request…");
  await page.goto(`${BASE}/search?q=10001`);
  check(
    "no-coverage state shown for uncovered ZIP",
    (await page.locator("text=No coverage here yet").count()) > 0
  );
  const reqBtn = page.getByRole("button", { name: /Request prices/i });
  // Next streams dynamic HTML — wait for the block to flush before checking.
  await reqBtn.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  check("coverage request button offered", await reqBtn.isVisible());
  await reqBtn.click();
  await page.waitForTimeout(800);
  const afterReq = await page.textContent("body");
  check(
    "coverage request accepted (or already counted on re-run)",
    /on the (coverage )?(wishlist|list)/i.test(afterReq)
  );

  // 5. SEO landing page + sitemap
  console.log("SEO pages…");
  await page.goto(`${BASE}/zyn-prices/60614`);
  const seoBody = await page.textContent("body");
  check("ZIP landing page renders with heading", /ZYN prices in Chicago, IL 60614/.test(seoBody));
  check("ZIP landing page lists stores", (await page.locator("table tr").count()) > 1);
  const sitemap = await page.evaluate(async () => (await fetch("/sitemap.xml")).text());
  check("sitemap includes ZIP landing pages", sitemap.includes("/zyn-prices/60614"));
  const robots = await page.evaluate(async () => (await fetch("/robots.txt")).text());
  check("robots.txt disallows /admin", robots.includes("/admin"));

  // 5b. New-member signup → immediately useful (one-tap confirm offered)
  console.log("Signup…");
  const signupRes = await page.evaluate(async () => {
    const r = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e2e-signup-${Date.now()}@example.com`,
        password: "a-long-demo-password-123",
        displayName: "SmokeTester",
      }),
    });
    return r.status;
  });
  check("signup succeeds", signupRes === 200, `(got ${signupRes})`);
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  check(
    "new member gets one-tap confirm chips",
    (await page.locator("button", { hasText: "Still this price?" }).count()) > 0
  );

  // 6. Admin login + import + watchlist
  console.log("Admin flows…");
  const login = await page.evaluate(async () => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "admin-demo-password" }),
    });
    return r.status;
  });
  check("admin login succeeds", login === 200, `(got ${login})`);

  // Signed-in members get the one-tap confirm chip on result cards.
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  check(
    "one-tap confirm offered when signed in",
    (await page.locator("button", { hasText: "Still this price?" }).count()) > 0
  );

  const saveRes = await page.evaluate(async (sid) => {
    const r = await fetch(`/api/stores/${sid}/save`, { method: "POST" });
    return r.status;
  }, storeId);
  check("signed-in user can save a store", saveRes === 200);
  await page.goto(`${BASE}/account`);
  check("watchlist shows the saved store", (await page.locator("text=Your watchlist").count()) > 0);

  const csv = fs.readFileSync(path.join(process.cwd(), "sample-data", "sample-import.csv"), "utf-8");
  const uploadResult = await page.evaluate(async (csvText) => {
    const fd = new FormData();
    fd.append("file", new File([csvText], "sample-import.csv", { type: "text/csv" }));
    const up = await fetch("/api/admin/imports", { method: "POST", body: fd });
    const upJson = await up.json();
    if (!up.ok) return { error: upJson.error };
    const commit = await fetch(`/api/admin/imports/${upJson.batchId}/commit`, { method: "POST" });
    const commitJson = await commit.json();
    return { batchId: upJson.batchId, counts: commitJson.counts, commitOk: commit.ok };
  }, csv);
  check("upload+preview+commit works", uploadResult.commitOk === true, JSON.stringify(uploadResult));
  check(
    "commit reports counts (10 data rows)",
    uploadResult.counts && uploadResult.counts.total === 10,
    JSON.stringify(uploadResult.counts)
  );

  await page.goto(`${BASE}/search?q=60614&radius=5`);
  const body2 = await page.textContent("body");
  check(
    "imported fictional store appears in search",
    body2.includes("Sample Mart Alpha") || uploadResult.counts.accepted === 0
  );

  // Desktop (default viewport) shows the list+map split with no toggle;
  // mobile widths keep a Map toggle. The toggle exists in the SSR HTML and
  // is removed when hydration detects a desktop width, so wait for
  // hydration first and only click if the map isn't already there.
  await page.waitForTimeout(1200);
  if ((await page.locator(".leaflet-container").count()) === 0) {
    const mapToggle = page.locator("button", { hasText: "Map" });
    if ((await mapToggle.count()) > 0)
      await mapToggle.first().click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  check("map container renders", (await page.locator(".leaflet-container").count()) > 0);

  for (const [path2, marker] of [
    ["/admin", "Active stores"],
    ["/admin/imports", "sample-import.csv"],
    ["/admin/coverage", "Coverage demand"],
    ["/admin/analytics", "Price range by ZIP"],
  ]) {
    await page.goto(`${BASE}${path2}`);
    check(`${path2} renders`, (await page.locator(`text=${marker}`).count()) > 0);
  }

  console.log(failures === 0 ? "\nAll smoke checks passed." : `\n${failures} smoke check(s) FAILED.`);
} catch (e) {
  failures++;
  console.error("Smoke test crashed:", e);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM"); // whole process group
    } catch {
      server.kill("SIGTERM");
    }
  }
}
process.exit(failures === 0 ? 0 : 1);
