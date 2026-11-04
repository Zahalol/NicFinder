// Dependency-free SVG price-history sparkline (server-renderable).
// Shows the trajectory of reported prices for one product line at one store.

import { formatCents } from "@/lib/money";

export interface SparkPoint {
  /** Observation time (ms epoch). */
  t: number;
  cents: number;
}

/** Trend summary across the plotted window, or null when not meaningful. */
export function trendSummary(points: SparkPoint[]): {
  deltaCents: number;
  days: number;
} | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = Math.round((last.t - first.t) / 86400_000);
  if (days < 1) return null;
  return { deltaCents: last.cents - first.cents, days };
}

export function PriceSparkline({
  points,
  width = 240,
  height = 56,
  ariaLabel,
}: {
  points: SparkPoint[];
  width?: number;
  height?: number;
  ariaLabel?: string;
}) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.t - b.t);

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const minT = sorted[0].t;
  const maxT = sorted[sorted.length - 1].t;
  const minC = Math.min(...sorted.map((p) => p.cents));
  const maxC = Math.max(...sorted.map((p) => p.cents));
  const spanT = Math.max(maxT - minT, 1);
  const spanC = Math.max(maxC - minC, 1);

  const x = (t: number) => pad + ((t - minT) / spanT) * w;
  // Flat series: draw mid-height. Otherwise leave headroom so dots don't clip.
  const y = (c: number) =>
    maxC === minC ? pad + h / 2 : pad + h - ((c - minC) / spanC) * h;

  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.cents).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${x(maxT).toFixed(1)},${height - pad} L${x(minT).toFixed(1)},${height - pad} Z`;

  const last = sorted[sorted.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={
        ariaLabel ??
        `Price history from ${formatCents(sorted[0].cents)} to ${formatCents(last.cents)}`
      }
      className="mt-2 block"
    >
      <path d={area} fill="#0d9488" opacity="0.08" />
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((p, i) => (
        <circle
          key={i}
          cx={x(p.t)}
          cy={y(p.cents)}
          r={i === sorted.length - 1 ? 3 : 2}
          fill={i === sorted.length - 1 ? "#0d9488" : "#99f6e4"}
          stroke="#0d9488"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
