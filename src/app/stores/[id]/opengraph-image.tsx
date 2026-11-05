// Dynamic share image for store pages: names the store so a shared link
// reads "this store" rather than the generic brand card. Deliberately
// carries NO price values — previews get cached by scrapers and a stale
// price shown as current would break the product's honesty promise.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "NicFinder — ZYN price comparison for this store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are immutable per deploy — read once per process, not per request.
const fontCache = new Map<string, Promise<Buffer>>();
function font(file: string) {
  let p = fontCache.get(file);
  if (!p) {
    p = readFile(path.join(process.cwd(), "src/assets/fonts", file));
    fontCache.set(file, p);
  }
  return p;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await prisma.store
    .findUnique({
      where: { id },
      select: { name: true, city: true, state: true, zip: true, status: true },
    })
    .catch(() => null);

  const name = store && store.status === "ACTIVE" ? store.name : "Store";
  const place =
    store && store.status === "ACTIVE"
      ? [store.city, store.state].filter(Boolean).join(", ") + (store.zip ? ` ${store.zip}` : "")
      : "";

  const [regular, bold] = await Promise.all([
    font("LiberationSans-Regular.ttf"),
    font("LiberationSans-Bold.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)",
          color: "white",
          fontFamily: "LiberationSans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox="0 0 512 512" style={{ marginRight: 18 }}>
            <path
              d="M256 88c-64 0-116 52-116 116 0 88 116 220 116 220s116-132 116-220c0-64-52-116-116-116z"
              fill="#ffffff"
            />
            <circle cx="256" cy="204" r="74" fill="#0d9488" />
          </svg>
          <span style={{ color: "#ccfbf1" }}>Nic</span>Finder
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 1020,
          }}
        >
          {name}
        </div>
        {place ? (
          <div style={{ marginTop: 14, fontSize: 38, color: "#ccfbf1" }}>{place}</div>
        ) : null}
        <div style={{ marginTop: 40, fontSize: 30, color: "#f0fdfa" }}>
          Compare reported ZYN prices, deals & freshness · Adults 21+
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "LiberationSans", data: regular, weight: 400 },
        { name: "LiberationSans", data: bold, weight: 700 },
      ],
    }
  );
}
