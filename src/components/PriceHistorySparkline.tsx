// Sparse-data price history: dots are individual observations; the faint
// step line shows what the site displayed between them (latest price
// persists until superseded — exactly the product's display policy, so the
// line encodes nothing we don't already claim). Rendered only with >= 3
// priced observations so sparse data can't masquerade as a trend.
//
// Single series → one hue, no legend; labels wear text tokens, not the
// series color; native <title> tooltips on each dot.

import { formatCents } from "@/lib/money";

export interface SparkPoint {
  observedAt: Date;
  priceCents: number;
  sourceType: string;
  status: string;
}

const W = 560;
const H = 120;
const PAD = { top: 14, right: 48, bottom: 20, left: 48 };

export function PriceHistorySparkline({
  points,
  lineName,
}: {
  points: SparkPoint[];
  lineName: string;
}) {
  if (points.length < 3) return null;
  const sorted = [...points].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime()
  );

  const t0 = sorted[0].observedAt.getTime();
  const t1 = sorted[sorted.length - 1].observedAt.getTime();
  const tSpan = Math.max(1, t1 - t0);
  const pMin = Math.min(...sorted.map((p) => p.priceCents));
  const pMax = Math.max(...sorted.map((p) => p.priceCents));
  // Give a flat series some vertical room instead of a degenerate scale.
  const pad = Math.max(25, Math.round((pMax - pMin) * 0.15));
  const yMin = pMin - pad;
  const yMax = pMax + pad;

  const x = (t: number) =>
    PAD.left + ((t - t0) / tSpan) * (W - PAD.left - PAD.right);
  const y = (c: number) =>
    PAD.top + (1 - (c - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  // Step-after path: each observed price holds until the next observation.
  let d = `M ${x(sorted[0].observedAt.getTime())} ${y(sorted[0].priceCents)}`;
  for (let i = 1; i < sorted.length; i++) {
    const xi = x(sorted[i].observedAt.getTime());
    d += ` H ${xi} V ${y(sorted[i].priceCents)}`;
  }

  const days = Math.max(1, Math.round(tSpan / 86400_000));
  const fmtDate = (dte: Date) =>
    dte.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const latest = sorted[sorted.length - 1];

  return (
    <figure className="mt-3" aria-label={`${lineName} price history chart`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xl"
        role="img"
      >
        {/* recessive min/max gridlines */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(pMax)} y2={y(pMax)} stroke="#e7e5e4" strokeWidth="1" />
        <line x1={PAD.left} x2={W - PAD.right} y1={y(pMin)} y2={y(pMin)} stroke="#e7e5e4" strokeWidth="1" />
        {/* displayed-price step line (faint — derived, not measured) */}
        <path d={d} fill="none" stroke="#0d9488" strokeOpacity="0.35" strokeWidth="2" />
        {/* observation dots */}
        {sorted.map((p, i) => (
          <circle
            key={i}
            cx={x(p.observedAt.getTime())}
            cy={y(p.priceCents)}
            r="4"
            fill="#0d9488"
            stroke="#ffffff"
            strokeWidth="2"
          >
            <title>
              {`${formatCents(p.priceCents)} observed ${p.observedAt.toLocaleDateString()} (${p.sourceType.toLowerCase()}${p.status !== "ACTIVE" ? `, ${p.status.toLowerCase()}` : ""})`}
            </title>
          </circle>
        ))}
        {/* direct labels: min/max on the left, latest on the right — text tokens */}
        <text x={PAD.left - 6} y={y(pMax) + 4} textAnchor="end" fontSize="11" fill="#78716c">
          {formatCents(pMax)}
        </text>
        <text x={PAD.left - 6} y={y(pMin) + 4} textAnchor="end" fontSize="11" fill="#78716c">
          {formatCents(pMin)}
        </text>
        <text
          x={x(latest.observedAt.getTime()) + 8}
          y={y(latest.priceCents) + 4}
          fontSize="11"
          fill="#44403c"
          fontWeight="600"
        >
          {formatCents(latest.priceCents)}
        </text>
        {/* x extent labels */}
        <text x={PAD.left} y={H - 4} fontSize="10" fill="#a8a29e">
          {fmtDate(sorted[0].observedAt)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" fontSize="10" fill="#a8a29e">
          {fmtDate(latest.observedAt)}
        </text>
      </svg>
      <figcaption className="text-[11px] text-stone-400">
        {lineName}: {sorted.length} observation{sorted.length === 1 ? "" : "s"} over{" "}
        {days} day{days === 1 ? "" : "s"}. Dots are individual reports; the line
        shows the price displayed between reports, not continuous measurement.
      </figcaption>
    </figure>
  );
}
