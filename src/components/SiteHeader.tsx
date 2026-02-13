'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/data';

function navLinkClass(active: boolean) {
  const base = 'rounded-lg px-3 py-2 qt-focus';

  if (active) {
    return (
      base +
      ' bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90'
    );
  }

  return base + ' text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10';
}

export function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <a
          href="#main"
          className="sr-only rounded-lg bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:not-sr-only qt-focus dark:bg-black dark:text-slate-100"
        >
          Skip to content
        </a>

        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg qt-focus"
        >
          <div aria-hidden="true" className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-sm" />
          <div>
            <div className="text-sm font-semibold tracking-tight">{SITE.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Trump quotes • dates • sources</div>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="no-scrollbar flex max-w-[65vw] items-center gap-1 overflow-x-auto whitespace-nowrap text-sm sm:max-w-none sm:gap-2"
        >
          <Link href="/" aria-current={isActive('/') ? 'page' : undefined} className={navLinkClass(isActive('/'))}>
            Timeline
          </Link>
          <Link
            href="/story"
            aria-current={isActive('/story') ? 'page' : undefined}
            className={navLinkClass(isActive('/story'))}
          >
            Story mode
          </Link>
          <Link
            href="/topics"
            aria-current={isActive('/topics') ? 'page' : undefined}
            className={navLinkClass(isActive('/topics'))}
          >
            Topics
          </Link>
          <Link
            href="/trending"
            aria-current={isActive('/trending') ? 'page' : undefined}
            className={navLinkClass(isActive('/trending'))}
          >
            Trending
          </Link>
          <Link
            href="/search"
            aria-current={isActive('/search') ? 'page' : undefined}
            className={navLinkClass(isActive('/search'))}
          >
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
