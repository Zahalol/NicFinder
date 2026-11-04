import { AgeGateForm } from "./AgeGateForm";

export const metadata = { title: "Age verification — NicFinder" };

export default async function AgeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16">
      <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-stone-900">Adults 21+ only</h1>
        <p className="mt-3 text-sm text-stone-600">
          NicFinder shows information about nicotine pouch prices. Nicotine
          products are age-restricted. You must be 21 years of age or older to
          use this site.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          This site is informational only — we do not sell nicotine products.
          Nicotine is addictive.
        </p>
        <AgeGateForm next={next ?? "/"} />
        <a
          href="https://www.fda.gov/tobacco-products"
          className="mt-4 inline-block text-xs text-stone-400 underline"
          rel="noopener noreferrer"
        >
          I am under 21 — learn about nicotine risks
        </a>
      </div>
    </div>
  );
}
