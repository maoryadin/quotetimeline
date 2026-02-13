export default function LoadingHome() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
        <div className="max-w-2xl animate-pulse">
          <div className="h-5 w-64 rounded bg-slate-200/70 dark:bg-white/10" />
          <div className="mt-5 h-11 w-[min(28rem,90%)] rounded bg-slate-200/70 dark:bg-white/10" />
          <div className="mt-4 h-4 w-[min(44rem,95%)] rounded bg-slate-200/60 dark:bg-white/10" />
          <div className="mt-2 h-4 w-[min(40rem,88%)] rounded bg-slate-200/60 dark:bg-white/10" />

          <div className="mt-6 flex items-center gap-2">
            <div className="h-11 flex-1 rounded-xl bg-slate-200/70 dark:bg-white/10" />
            <div className="h-11 w-24 rounded-xl bg-slate-200/70 dark:bg-white/10" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="h-10 w-36 rounded-xl bg-slate-200/70 dark:bg-white/10" />
            <div className="h-10 w-40 rounded-xl bg-slate-200/70 dark:bg-white/10" />
            <div className="h-10 w-40 rounded-xl bg-slate-200/70 dark:bg-white/10" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3 animate-pulse">
          <div className="h-6 w-28 rounded bg-slate-200/70 dark:bg-white/10" />
          <div className="h-4 w-40 rounded bg-slate-200/60 dark:bg-white/10" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-black/20"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="h-3 w-24 rounded bg-slate-200/70 dark:bg-white/10" />
                  <div className="h-3 w-20 rounded bg-slate-200/70 dark:bg-white/10" />
                </div>
                <div className="mt-3 h-4 w-[95%] rounded bg-slate-200/70 dark:bg-white/10" />
                <div className="mt-2 h-4 w-[80%] rounded bg-slate-200/70 dark:bg-white/10" />
              </div>
            ))}
          </div>

          <aside className="hidden lg:block">
            <div className="animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
              <div className="h-4 w-32 rounded bg-slate-200/60 dark:bg-white/10" />
              <div className="mt-3 h-40 w-full rounded bg-slate-200/70 dark:bg-white/10" />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
