"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-24 text-center">
      <h1 className="text-xl font-medium text-stone-900 dark:text-stone-100">Something went wrong</h1>
      <p className="mt-2 text-sm text-stone-500">
        An unexpected error occurred{error.digest ? ` (ref ${error.digest})` : ""}. Your data is safe.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-5 py-2.5 font-medium hover:bg-stone-700 dark:hover:bg-white"
      >
        Try again
      </button>
    </div>
  );
}
