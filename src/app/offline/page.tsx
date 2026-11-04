export const metadata = {
  title: "Offline",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="py-20 max-w-md mx-auto text-center">
      <div className="text-5xl" aria-hidden>
        ⌖
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900 dark:text-stone-100">
        You&apos;re offline
      </h1>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
        NicFinder needs a connection to show current prices — we never show
        cached prices as if they were live. Reconnect and try again.
      </p>
      <p className="mt-6">
        {/* Deliberately a plain anchor: this page is served from the service
            worker cache while offline, and retrying must be a full network
            navigation, not a client-side route transition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-block rounded-xl bg-teal-600 text-white px-5 py-2.5 font-medium hover:bg-teal-700"
        >
          Retry
        </a>
      </p>
    </div>
  );
}
