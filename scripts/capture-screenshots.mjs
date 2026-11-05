// Screenshot tour for docs/screenshots/ — retake every image in one run.
//
// Prereqs: `npm run build`, and a NEW empty database that is migrated and
// seeded, so the shots show only demo data (old e2e leftovers would appear
// otherwise). Playwright must be available (preinstalled in Claude cloud
// containers; elsewhere `npm i -D playwright`). For example:
//
//   createdb nicfinder_screenshots
//   export DATABASE_URL=postgresql://USER:PASS@localhost:5432/nicfinder_screenshots
//   export SESSION_SECRET=any-long-random-string
//   npx prisma migrate deploy && npm run db:seed
//   node scripts/capture-screenshots.mjs
//
// The script starts its own production server on PORT, signs in as the
// seeded demo accounts, uploads sample-data/sample-import.csv to get an
// import preview, and writes PNGs (2x scale) to docs/screenshots/. It writes
// data to the database (a saved store, an import preview batch), so run it
// against a throwaway dev database, never production. Update
// docs/screenshots/README.md if you add or rename shots.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright not available — install it or run where it is preinstalled.");
  process.exit(1);
}

const PORT = 3110;
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve("docs/screenshots");
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

async function login(page, email, password) {
  const status = await page.evaluate(
    async ({ email, password }) =>
      (
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      ).status,
    { email, password }
  );
  if (status !== 200) throw new Error(`login failed for ${email}: ${status}`);
}

async function newContext(browser, { viewport = DESKTOP, scheme = "light", ageOk = true } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: scheme });
  if (ageOk) await ctx.addCookies([{ name: "nf_age", value: "21plus", url: BASE }]);
  return ctx;
}

async function shot(page, name, url, { fullPage = false, settle = 1200, before } = {}) {
  if (url) await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(settle); // maps/tiles and client hydration
  if (before) await before(page);
  await page.screenshot({ path: path.join(OUT, name), fullPage });
  console.log("  ✓", name);
}

let server;
let browser;
let failed = false;
try {
  console.log("Starting production server…");
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    detached: true,
    env: process.env,
  });
  await waitForServer();
  browser = await chromium.launch();

  // Retake the whole tour: remove old images so stale shots can't linger.
  for (const f of readdirSync(OUT)) if (f.endsWith(".png")) unlinkSync(path.join(OUT, f));

  // ---- Visitor (signed out) -------------------------------------------
  console.log("Visitor…");
  {
    const ctx = await newContext(browser, { ageOk: false });
    const page = await ctx.newPage();
    await shot(page, "01-age-gate.png", "/search?q=60614&radius=5");
    await ctx.close();
  }
  const visitor = await newContext(browser);
  const v = await visitor.newPage();
  await shot(v, "02-home.png", "/");
  await shot(v, "03-search-desktop.png", "/search?q=60614&radius=5", { settle: 2500 });
  await shot(v, "04-search-5-cans.png", "/search?q=60614&radius=5&qty=5", { settle: 2500 });
  await v.goto(`${BASE}/search?q=60614&radius=5`);
  const fuelHref = (
    await v.locator("a", { hasText: "Demo Fuel Stop #1" }).first().getAttribute("href")
  )?.split("?")[0];
  const cornerHref = (
    await v.locator("a", { hasText: "Demo Corner Mart #2" }).first().getAttribute("href")
  )?.split("?")[0];
  if (!fuelHref || !cornerHref) throw new Error("seeded demo stores not found in search");
  const fuelId = fuelHref.split("/")[2];
  const cornerId = cornerHref.split("/")[2];
  await shot(v, "05-store-detail.png", fuelHref, { fullPage: true, settle: 2500 });
  await shot(v, "06-compare.png", `/compare?a=${fuelId}&b=${cornerId}&qty=5`, { fullPage: true });
  await shot(v, "07-zip-landing-page.png", "/zyn-prices/60614", { fullPage: true });
  await shot(v, "08-covered-areas.png", "/zyn-prices");
  await shot(v, "09-price-drops.png", "/price-drops");
  await shot(v, "10-how-it-works.png", "/how-it-works", { fullPage: true });
  await shot(v, "11-no-coverage.png", "/search?q=60435");
  await visitor.close();

  // ---- Signed-in member -----------------------------------------------
  console.log("Member…");
  const member = await newContext(browser);
  const m = await member.newPage();
  await m.goto(BASE);
  await login(m, "newbie@example.com", "newbie-demo-password");
  for (const id of [fuelId, cornerId])
    await m.evaluate((sid) => fetch(`/api/stores/${sid}/save`, { method: "POST" }), id);
  await shot(m, "12-search-signed-in.png", "/search?q=60614&radius=5", { settle: 2500 });
  await shot(m, "13-contribute.png", fuelHref, {
    settle: 2000,
    before: (p) =>
      p.locator("text=Was this price right?").first().scrollIntoViewIfNeeded().catch(() => {}),
  });
  await shot(m, "14-account.png", "/account", { fullPage: true });
  await member.close();

  // ---- Admin ------------------------------------------------------------
  console.log("Admin…");
  const admin = await newContext(browser);
  const a = await admin.newPage();
  await a.goto(BASE);
  await login(a, "admin@example.com", "admin-demo-password");
  await shot(a, "15-admin-overview.png", "/admin", { fullPage: true });
  const csv = readFileSync("sample-data/sample-import.csv", "utf8");
  const batchId = await a.evaluate(async (text) => {
    const fd = new FormData();
    fd.append("file", new Blob([text], { type: "text/csv" }), "sample-import.csv");
    const r = await fetch("/api/admin/imports", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    return j.batchId ?? j.id ?? null;
  }, csv);
  if (batchId) await shot(a, "16-admin-import-preview.png", `/admin/imports/${batchId}`, { fullPage: true });
  else console.warn("  ! import upload failed; skipped 16-admin-import-preview.png");
  await shot(a, "17-admin-review.png", "/admin/review", { fullPage: true });
  await shot(a, "18-admin-collect.png", "/admin/collect");
  await shot(a, "19-admin-coverage.png", "/admin/coverage", { fullPage: true });
  await shot(a, "20-admin-economics.png", "/admin/economics", { fullPage: true });
  await shot(a, "21-admin-analytics.png", "/admin/analytics", { fullPage: true });
  await shot(a, "22-admin-settings.png", "/admin/settings", { fullPage: true });
  await admin.close();

  // ---- Mobile + dark mode ---------------------------------------------
  console.log("Mobile and dark mode…");
  const mobile = await newContext(browser, { viewport: MOBILE });
  const mp = await mobile.newPage();
  await shot(mp, "23-mobile-search.png", "/search?q=60614&radius=5", { settle: 2000 });
  await shot(mp, "24-mobile-map.png", null, {
    before: async (p) => {
      await p.locator('[aria-label="Result view"] button', { hasText: "Map" }).click();
      await p.waitForTimeout(2500);
    },
  });
  await shot(mp, "25-mobile-store.png", fuelHref, { fullPage: true, settle: 2000 });
  await mobile.close();
  const dark = await newContext(browser, { scheme: "dark" });
  const d = await dark.newPage();
  await shot(d, "26-dark-search.png", "/search?q=60614&radius=5", { settle: 2500 });
  await shot(d, "27-dark-store.png", fuelHref, { settle: 2500 });
  await dark.close();

  console.log("\nAll screenshots written to docs/screenshots/.");
} catch (e) {
  failed = true;
  console.error("Screenshot capture failed:", e);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
}
process.exit(failed ? 1 : 0);
