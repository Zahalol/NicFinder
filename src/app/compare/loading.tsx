export default function CompareLoading() {
  return (
    <div className="py-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-4 w-28 rounded bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-8 w-56 rounded bg-stone-200 dark:bg-stone-700" />
      <div className="mt-3 h-8 w-72 rounded bg-stone-100 dark:bg-stone-800" />
      <div className="mt-5 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}
