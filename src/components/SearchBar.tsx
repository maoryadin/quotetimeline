'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const disabled = useMemo(() => q.trim().length === 0, [q]);

  return (
    <form
      className="flex w-full items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search quotes, context, or source title…"
        aria-label="Search quotes"
        enterKeyHint="search"
        className="qt-focus h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-400 dark:border-white/10 dark:bg-black/30 dark:text-slate-100"
        name="q"
      />
      <button
        type="submit"
        disabled={disabled}
        className="qt-focus h-11 shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        Search
      </button>
    </form>
  );
}
