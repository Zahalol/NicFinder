import { SearchBox } from "@/components/SearchBox";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function HomePage() {
  const [storeCount, pricedCount] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.store.count({
      where: { status: "ACTIVE", observations: { some: { status: "ACTIVE" } } },
    }),
  ]);

  return (
    <div className="py-14 sm:py-20">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Find the best nicotine pouch price near you
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400">
          Compare reported ZYN prices at gas stations and convenience stores.
          Free to browse — no account needed.
        </p>
        <div className="mt-8">
          <SearchBox autoFocus />
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Try a Chicago ZIP like <Link className="underline" href="/search?q=60614">60614</Link> — our
          pilot area. {storeCount} stores tracked, {pricedCount} with reported prices.
        </p>
      </div>

      <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {[
          {
            title: "Honest prices",
            body: "Every price shows where it came from and how old it is. No price? We say so — we never invent one.",
          },
          {
            title: "Community-verified",
            body: "Signed-in members confirm or correct prices. Trusted contributors keep listings fresh.",
          },
          {
            title: "Deals that math out",
            body: "Multi-can deals like “buy 5, save $1 each” are compared per-can, separately from single-can prices.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5">
            <h2 className="font-medium text-stone-900 dark:text-stone-100">{f.title}</h2>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
