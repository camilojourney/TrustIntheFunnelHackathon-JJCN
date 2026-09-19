// Skeleton while the report loads. Same shape as the real page, so the layout
// does not jump.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8" aria-busy="true">
      <p className="sr-only">Loading the claim evidence report.</p>
      <div className="space-y-2">
        <Bar className="h-4 w-32" />
        <Bar className="h-7 w-72" />
      </div>
      <Bar className="h-16 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Bar className="h-24" />
        <Bar className="h-24" />
        <Bar className="h-24" />
      </div>
      <div className="space-y-4">
        <Bar className="h-48 w-full" />
        <Bar className="h-48 w-full" />
        <Bar className="h-48 w-full" />
      </div>
    </main>
  );
}
