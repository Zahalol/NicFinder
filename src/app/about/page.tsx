import Link from "next/link";

export const metadata = {
  title: "How NicFinder works",
  description:
    "Where NicFinder's reported ZYN prices come from, what the confidence and freshness labels mean, and what we will never do with the data.",
};

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const SECTIONS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "Where prices come from",
    body: (
      <>
        Every price on NicFinder is a <strong>recorded observation</strong>:
        a community member reporting what they paid, a staff member entering a
        price, or a bulk data import. Observations are never edited or
        deleted — a newer report supersedes an older one, and the full history
        stays visible on each store page.
      </>
    ),
  },
  {
    title: "What the confidence label means",
    body: (
      <>
        The <em>High / Medium / Low confidence</em> pill summarizes the
        evidence behind a price: where it came from, how old it is, and how
        many members have confirmed or disputed it. Confirmations raise
        confidence; disputes and age lower it. Hover (or long-press) the pill
        to see exactly why. The score is computed from recorded evidence only
        — we never nudge it by hand.
      </>
    ),
  },
  {
    title: "Freshness and honesty rules",
    body: (
      <>
        Prices older than the staleness window are flagged{" "}
        <em>may be outdated</em>; truly old ones are retired to history and
        the store shows <em>no recent price</em> instead. We never guess: a
        store with no reported price says so, ZYN Ultra never inherits the
        regular ZYN price, quantities whose deal terms are unknown show a
        “?”, and fictional demonstration stores are always labeled.
      </>
    ),
  },
  {
    title: "Deals and quantity math",
    body: (
      <>
        Multi-can deals (e.g. “buy 5, save $1 each”) are compared{" "}
        <strong>per can</strong> at the quantity you choose, and totals
        include only terms that were actually reported. The “worth the trip?”
        line estimates driving cost at the IRS standard mileage rate (70¢ per
        mile) so savings and detours are comparable.
      </>
    ),
  },
  {
    title: "Contributing",
    body: (
      <>
        Browsing never requires an account. Signing in lets you confirm a
        price in one tap, report a different one, save stores to your
        watchlist, and leave store notes. New reports from newer members may
        need corroboration before they replace the displayed price; members
        with a track record publish immediately.
      </>
    ),
  },
  {
    title: "What NicFinder is not",
    body: (
      <>
        NicFinder is an informational price-comparison service for adults
        21+. We do not sell, deliver, advertise, or promote nicotine
        products, and we show no sponsored placements — stores are ranked
        only by distance, price, or recency, as you choose. Prices vary by
        store and over time, usually exclude tax, and depend on stock; always
        confirm with the store before a special trip.
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        How NicFinder works
      </h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        The short version: real reported prices, full history, visible
        uncertainty, and nothing invented.
      </p>

      <div className="mt-8 space-y-6">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            id={slugify(s.title)}
            className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 scroll-mt-20"
          >
            <h2 className="font-medium text-stone-900 dark:text-stone-100">{s.title}</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-stone-600 dark:text-stone-400">
        Questions or a store we should cover?{" "}
        <Link href="/search" className="text-teal-700 dark:text-teal-400 underline">
          Search your area
        </Link>{" "}
        and use “request coverage”, or sign up and leave a note on any store.
      </p>
    </div>
  );
}
