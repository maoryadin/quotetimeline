export default function Loading() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200/70 dark:bg-white/10" />
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-black/20"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
              </div>
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
              <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
            </div>
          ))}
        </div>

        <div className="sr-only" aria-live="polite">
          Loading…
        </div>
      </div>
    </main>
  );
}
