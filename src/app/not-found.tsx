import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-5xl font-semibold text-stone-300">404</p>
      <h1 className="mt-3 text-xl font-medium text-stone-900">Page not found</h1>
      <p className="mt-2 text-sm text-stone-500">
        That page doesn’t exist — maybe the store was merged or retired.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-stone-900 text-white px-5 py-2.5 font-medium hover:bg-stone-700"
      >
        Back to search
      </Link>
    </div>
  );
}
