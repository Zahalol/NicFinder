export default function SearchLoading() {
  return (
    <div className="py-6 animate-pulse">
      <div className="h-12 max-w-xl mx-auto rounded-xl bg-stone-200 dark:bg-stone-700" />
      <div className="mt-6 h-5 w-2/3 rounded bg-stone-100 dark:bg-stone-800" />
      <div className="mt-5 h-24 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}
