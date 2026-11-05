// Dynamic share image for ZIP landing pages (the acquisition surface).
// Shows the area and how much data we have — never price values, which go
// stale in scraper caches.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { zipInfo } from "@/lib/geocode";

export const runtime = "nodejs";
export const alt = "NicFinder — ZYN prices in this area";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(file: string) {
  return readFile(path.join(process.cwd(), "src/assets/fonts", file));
}

export default async function OgImage({ params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params;
  const info = /^\d{5}$/.test(zip) ? zipInfo(zip) : null;
  const storeCount = info
    ? await prisma.store
        .count({ where: { status: "ACTIVE", zip } })
        .catch(() => 0)
    : 0;

  const title = info ? `ZYN prices in ${info.city}, ${info.state} ${zip}` : "ZYN prices near you";
  const sub =
    storeCount > 0
      ? `${storeCount} store${storeCount === 1 ? "" : "s"} tracked · community-verified`
      : "Community-verified price comparison";

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
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.12,
            maxWidth: 1020,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 20, fontSize: 36, color: "#ccfbf1" }}>{sub}</div>
        <div style={{ marginTop: 40, fontSize: 30, color: "#f0fdfa" }}>
          Prices, deals & freshness at nearby stores · Adults 21+
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
