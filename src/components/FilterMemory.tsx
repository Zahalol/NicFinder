"use client";

// EXPERIMENT (Cycle 18): remember the visitor's last filter choices
// (product/cans/radius/sort) on this device and re-apply them to fresh
// searches that don't specify them. Delete this file + its call site in
// search/page.tsx to remove.

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const KEY = "nf_filter_prefs";
const DEFAULTS = { product: "zyn", qty: "1", radius: "5", sort: "distance" };
type Prefs = typeof DEFAULTS;

export function FilterMemory() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const hasExplicit =
      params.has("qty") || params.has("radius") || params.has("sort") || params.has("product");
    const hasQuery = params.has("q") || params.has("lat");

    try {
      if (hasExplicit) {
        // Record the visitor's current choices.
        const prefs: Prefs = {
          product: params.get("product") ?? DEFAULTS.product,
          qty: params.get("qty") ?? DEFAULTS.qty,
          radius: params.get("radius") ?? DEFAULTS.radius,
          sort: params.get("sort") ?? DEFAULTS.sort,
        };
        localStorage.setItem(KEY, JSON.stringify(prefs));
        return;
      }
      if (!hasQuery) return; // nothing to search yet
      const saved: Partial<Prefs> = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      const differs = (Object.keys(DEFAULTS) as (keyof Prefs)[]).some(
        (k) => saved[k] && saved[k] !== DEFAULTS[k]
      );
      if (!differs) return;
      const next = new URLSearchParams(params.toString());
      for (const k of Object.keys(DEFAULTS) as (keyof Prefs)[]) {
        if (saved[k]) next.set(k, saved[k]!);
      }
      router.replace(`/search?${next.toString()}`);
    } catch {
      // storage blocked — preferences are a convenience only
    }
  }, [params, router]);

  return null;
}
