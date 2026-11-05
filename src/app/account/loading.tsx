export default function AccountLoading() {
  return (
    <div className="py-8 max-w-2xl mx-auto animate-pulse">
      <div className="h-8 w-48 rounded bg-stone-200" />
      <div className="mt-2 h-4 w-72 rounded bg-stone-100" />
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-stone-100" />
        ))}
      </div>
      <div className="mt-8 h-6 w-32 rounded bg-stone-100" />
      <div className="mt-3 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
