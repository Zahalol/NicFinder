export default function StoreLoading() {
  return (
    <div className="py-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-4 w-28 rounded bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-8 w-1/2 rounded bg-stone-200" />
      <div className="mt-2 h-4 w-2/3 rounded bg-stone-100 dark:bg-stone-800" />
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className="h-36 rounded-xl bg-stone-100 dark:bg-stone-800" />
        <div className="h-36 rounded-xl bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="mt-6 h-28 rounded-xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
}
