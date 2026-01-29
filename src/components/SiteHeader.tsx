import Link from 'next/link';
import { SITE } from '@/lib/data';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/70 backdrop-blur dark:bg-black/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-sm" />
          <div>
            <div className="text-sm font-semibold tracking-tight">{SITE.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Quotes • dates • sources</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/trending"
            className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Trending
          </Link>
          <Link
            href="/people"
            className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
          >
            People
          </Link>
          <Link
            href="/search"
            className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
