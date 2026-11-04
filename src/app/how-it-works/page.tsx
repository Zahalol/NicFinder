import Link from "next/link";

export const metadata = {
  title: "How NicFinder works",
  description:
    "Where NicFinder's ZYN price data comes from, what the freshness and confidence labels mean, and how community confirmations, disputes and moderation keep listings honest. Informational service for adults 21+.",
};

// Trust page: every claim here must match actual system behavior. If a
// policy changes in code, change it here too.

export default function HowItWorksPage() {
  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900">How NicFinder works</h1>
      <p className="mt-2 text-stone-600">
        NicFinder is an informational price-comparison service for adults 21+.
        We don’t sell nicotine products, process orders, or take money from
        stores. This page explains where every number on the site comes from.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-900">Where prices come from</h2>
        <ul className="mt-2 space-y-2 text-sm text-stone-700">
          <li>
            <strong>Data imports</strong> — spreadsheets of observed shelf
            prices (for example from store calls), validated row by row.
            Malformed or implausible rows are rejected or held for review, and
            every import can be reversed.
          </li>
          <li>
            <strong>Community reports</strong> — signed-in members confirm the
            displayed price or report a different one from the shelf.
          </li>
          <li>
            <strong>Staff entries</strong> — manual corrections by moderators,
            always attributed and audited.
          </li>
        </ul>
        <p className="mt-2 text-sm text-stone-600">
          Every price is an <em>observation</em> with a date and source — never
          an estimate. If a store has no recent observation we say “no recent
          price” rather than inventing one, and a store reported as not
          carrying a product is shown exactly that way. Old observations are
          never deleted: corrections supersede or invalidate them, so the
          history stays auditable.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-900">
          Freshness and confidence labels
        </h2>
        <p className="mt-2 text-sm text-stone-700">
          Each displayed price carries its age (“updated 2d ago”, or a stale
          warning once it’s older than the configured threshold) and a
          confidence chip — <strong>high</strong>, <strong>medium</strong> or{" "}
          <strong>low</strong>. The chip is computed from recency, the source
          type, independent confirmations, open disputes, and the source’s own
          stated confidence. Hover or long-press it to see exactly which
          factors applied — it’s deliberately a three-level label, not a fake
          percentage.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-900">
          What happens when you report a price
        </h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-stone-700">
          <li>
            <strong>Confirming</strong> the displayed price records a
            verification on that observation (one per person, with a cooldown
            per store).
          </li>
          <li>
            <strong>Reporting a different price</strong> creates a pending
            proposal. It publishes when enough independent members report the
            same price, immediately for long-standing trusted contributors
            within guardrails, or after a moderator reviews it. Large or
            implausible changes always go to review.
          </li>
          <li>
            <strong>Flagging an observation</strong> (the “report issue” link
            in price history) tells moderators a specific entry — current or
            historical — is wrong. Upheld flags invalidate the entry while
            keeping it visible in history with the reason.
          </li>
        </ol>
        <p className="mt-2 text-sm text-stone-600">
          Store pages show how many reports are still pending, so you can tell
          the difference between “verified quiet” and “changes in flight”.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-900">Reputation</h2>
        <p className="mt-2 text-sm text-stone-700">
          Contributors earn reputation when their reports hold up — published
          corrections, confirmations that stay accurate — and lose it when
          reports are rejected, disproved, or abusive. Higher reputation
          unlocks faster publication within strict price guardrails; it never
          lets anyone bypass review for large changes.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-900">What we don’t do</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
          <li>No sales, delivery, or purchase facilitation — information only.</li>
          <li>No invented prices, trends, or availability.</li>
          <li>No content aimed at anyone under 21.</li>
          <li>
            Demonstration data is always labeled: fictional “Demo” stores carry
            a badge and are excluded from search indexing.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-stone-500">
        Spot something wrong?{" "}
        <Link href="/search" className="text-teal-700 underline">
          Find the store
        </Link>{" "}
        and use Confirm / Report a different price — that’s exactly what keeps
        this useful.
      </p>
    </div>
  );
}
