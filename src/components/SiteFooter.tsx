import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200/70 py-10 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <p>
              QuoteTimeline is an informational index. Not affiliated with or endorsed by any person or organization. Always verify claims
              using the linked primary source.
            </p>
            <p className="mt-2">© {new Date().getFullYear()} QuoteTimeline</p>
          </div>

          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link className="qt-focus text-slate-600 hover:underline dark:text-slate-300" href="/about">
              About
            </Link>
            <Link className="qt-focus text-slate-600 hover:underline dark:text-slate-300" href="/sources">
              Sources
            </Link>
            <Link className="qt-focus text-slate-600 hover:underline dark:text-slate-300" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
