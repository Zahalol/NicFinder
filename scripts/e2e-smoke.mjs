// End-to-end smoke test against a production build.
// Prereqs: `npm run build` and a migrated+seeded dev database.
// Runs: age gate → search → store detail → guest authz → admin login →
// CSV import preview/commit → imported store appears in search.
//
// Uses the environment's preinstalled Playwright/Chromium.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

// Playwright may be installed globally (e.g. preconfigured CI images) rather
// than in node_modules — resolve it via require from either location.
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "Playwright not available — install it (`npm i -D playwright`) or run in an environment that provides it. Skipping smoke test with failure."
  );
  process.exit(2);
}

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
let failures = 0;
let server;
let browser;

function check(name, cond, extra = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
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
  console.log("Starting production server…");
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
  await waitForServer(BASE);

  browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 1. Age gate intercepts everything
  console.log("Age gate…");
  await page.goto(`${BASE}/search?q=60614`);
  check("redirects to age gate", page.url().includes("/age-gate"));
  await page.getByRole("button", { name: /21 or older/i }).click();
  await page.waitForURL("**/search**");
  check("returns to the requested page after confirming", page.url().includes("/search"));

  // 2. Search results (acceptance 2)
  console.log("Search 60614…");
  await page.waitForSelector("text=stores", { timeout: 15000 });
  const storeLinks = await page.locator('a[href^="/stores/"]').count();
  check("shows store cards", storeLinks > 0, `(found ${storeLinks})`);
  check("shows demo-data labeling", (await page.locator("text=demo data").count()) > 0);
  check(
    "shows honest no-price state for unverified stores",
    (await page.locator("text=No price yet").count()) > 0
  );
  check("shows at least one price", (await page.locator("text=$6.49").count()) > 0);

  // Sorting by price puts cheapest demo store first
  await page.goto(`${BASE}/search?q=60614&sort=price&radius=5`);
  const firstCard = page.locator('a[href^="/stores/"]').first();
  const firstText = await firstCard.textContent();
  check("price sort puts a priced store first", /\$\d/.test(firstText ?? ""));

  // ZYN Ultra toggle shows unknown states rather than inheriting (acceptance 4)
  await page.goto(`${BASE}/search?q=60614&product=zyn-ultra&radius=5`);
  const bodyText = await page.textContent("body");
  check(
    "Ultra view loads with its own (sparser) prices",
    bodyText.includes("No price yet") && bodyText.includes("$7.49")
  );

  // 3. Store detail
  console.log("Store detail…");
  await page.goto(`${BASE}/search?q=60614&radius=5`);
  await page.locator('a[href^="/stores/"]').first().click();
  await page.waitForSelector("text=Price history");
  check("store page shows price history", true);
  check(
    "guests see sign-in prompt instead of contribute form",
    (await page.locator("text=Sign in").count()) > 0
  );

  // 4. Guest cannot submit contributions (acceptance 9)
  const storeId = page.url().split("/stores/")[1]?.split("?")[0];
  const guestPost = await page.evaluate(async (sid) => {
    const r = await fetch(`/api/stores/${sid}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "CONFIRM" }),
    });
    return r.status;
  }, storeId);
  check("guest contribution POST rejected with 401", guestPost === 401, `(got ${guestPost})`);

  // Guest cannot reach admin APIs (acceptance 12 / admin authz)
  const guestAdmin = await page.evaluate(async () => {
    const r = await fetch("/api/admin/settings");
    return r.status;
  });
  check("guest admin API rejected with 401", guestAdmin === 401, `(got ${guestAdmin})`);
  await page.goto(`${BASE}/admin`);
  check("guest /admin redirects to login", page.url().includes("/login"));

  // 5. Admin login + import flow (acceptance 6)
  console.log("Admin import flow…");
  const login = await page.evaluate(async () => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "admin-demo-password" }),
    });
    return r.status;
  });
  check("admin login succeeds", login === 200, `(got ${login})`);

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
    body2.includes("Sample Mart Alpha") || uploadResult.counts.accepted === 0 /* re-run: idempotent */
  );

  // Map view renders container (tiles need network; container suffices)
  await page.locator("button", { hasText: "Map" }).first().click();
  await page.waitForTimeout(1500);
  check("map container renders", (await page.locator(".leaflet-container").count()) > 0);

  // Admin pages render
  await page.goto(`${BASE}/admin`);
  check("admin overview renders", (await page.locator("text=Active stores").count()) > 0);
  await page.goto(`${BASE}/admin/imports`);
  check("admin imports page lists the batch", (await page.locator("text=sample-import.csv").count()) > 0);

  console.log(failures === 0 ? "\nAll smoke checks passed." : `\n${failures} smoke check(s) FAILED.`);
} catch (e) {
  failures++;
  console.error("Smoke test crashed:", e);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill("SIGTERM");
}
process.exit(failures === 0 ? 0 : 1);
