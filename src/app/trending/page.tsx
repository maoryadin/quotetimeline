export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getTrendingTopics } from '@/lib/data';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${base}/trending`;

  const title = 'Trending topics | QuoteTimeline';
  const description = 'A lightweight snapshot of topic frequency across currently indexed quotes.';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TrendingPage() {
  // v1 “trending” = topic frequency across indexed quotes.
  const ranked = await getTrendingTopics();

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Home
          </Link>
          <Link href="/search" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
            Search →
          </Link>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trending</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">A lightweight snapshot based on currently indexed quotes.</p>
        </header>

        <section className="mt-10">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ranked.map((x) => (
              <li
                key={x.slug}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:focus-within:ring-offset-black"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link className="qt-focus text-base font-semibold text-slate-900 hover:underline dark:text-slate-100" href={`/topic/${x.slug}`}>
                    {x.name}
                  </Link>
                  <div className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
                    {x.n}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">/topic/{x.slug}</div>
              </li>
            ))}
          </ul>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
