export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}
