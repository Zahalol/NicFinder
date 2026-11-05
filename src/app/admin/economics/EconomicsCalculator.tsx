"use client";

// Interactive what-if calculator. Every number on screen is either a real
// database stat (passed in) or derived live from the assumption inputs the
// admin can see and change — no hidden constants, no calls initiated.

import { useState } from "react";

export interface EconomicsStats {
  realStores: number;
  realPricedFresh: number;
  realPricedStale: number;
  demoStores: number;
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function EconomicsCalculator({ stats }: { stats: EconomicsStats }) {
  const [costPerCall, setCostPerCall] = useState(0.35);
  const [successRate, setSuccessRate] = useState(55);
  const [cadenceDays, setCadenceDays] = useState(14);
  const [targetStores, setTargetStores] = useState(stats.realStores || 27);

  const sr = Math.min(100, Math.max(1, successRate)) / 100;
  const cadence = Math.max(1, cadenceDays);
  const stores = Math.max(0, targetStores);

  const successfulCallsPerMonth = (stores * 30) / cadence;
  const dialsPerMonth = successfulCallsPerMonth / sr;
  const monthlyCost = dialsPerMonth * Math.max(0, costPerCall);
  const perStoreMonthly = stores > 0 ? monthlyCost / stores : 0;

  const field =
    "w-24 rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 text-sm text-right";

  return (
    <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5">
      <h2 className="font-medium text-stone-900 dark:text-stone-100">What-if: automated call refresh</h2>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
        Projection only — nothing here initiates calls. Change the assumptions;
        every output updates from exactly these four numbers.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 text-sm text-stone-700 dark:text-stone-300">
          Stores to keep priced
          <input
            type="number"
            min={0}
            value={targetStores}
            onChange={(e) => setTargetStores(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-stone-700 dark:text-stone-300">
          Refresh every (days)
          <input
            type="number"
            min={1}
            value={cadenceDays}
            onChange={(e) => setCadenceDays(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-stone-700 dark:text-stone-300">
          Cost per dial (USD)
          <input
            type="number"
            min={0}
            step={0.05}
            value={costPerCall}
            onChange={(e) => setCostPerCall(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-stone-700 dark:text-stone-300">
          Answered-and-priced rate (%)
          <input
            type="number"
            min={1}
            max={100}
            value={successRate}
            onChange={(e) => setSuccessRate(Number(e.target.value))}
            className={field}
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Successful calls / month",
            value: Math.ceil(successfulCallsPerMonth).toLocaleString(),
          },
          { label: "Dials / month (incl. failures)", value: Math.ceil(dialsPerMonth).toLocaleString() },
          { label: "Projected monthly cost", value: money(monthlyCost) },
          { label: "Cost per store / month", value: money(perStoreMonthly) },
        ].map((t) => (
          <div key={t.label} className="rounded-lg bg-stone-50 dark:bg-stone-800 p-3">
            <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">{t.value}</div>
            <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{t.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-stone-400">
        Formula: successful calls = stores × 30 ÷ cadence; dials = successful ÷
        answered-rate; cost = dials × cost-per-dial. Telephony/agent pricing
        varies — verify rates with the vendor before relying on this.
      </p>
    </div>
  );
}
