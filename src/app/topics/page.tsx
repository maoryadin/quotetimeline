export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getTopicsWithCounts } from '@/lib/data';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${base}/topics`;

  const title = 'Trump topics | QuoteTimeline';
  const description = 'Browse topic timelines for currently indexed Trump quotes.';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TopicsPage() {
  const topics = await getTopicsWithCounts();

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:focus-visible:ring-offset-black">
            ← Home
          </Link>
          <Link href="/search" className="text-sm text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:focus-visible:ring-offset-black">
            Search →
          </Link>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trump topics</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Browse topic timelines for currently indexed Trump quotes. Counts reflect how often a topic appears in the quote set.
          </p>
        </header>

        <section className="mt-10">
          {topics.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {topics.map((t) => (
                <li
                  key={t.slug}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:focus-within:ring-offset-black"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      className="text-base font-semibold text-slate-900 hover:underline dark:text-slate-100"
                      href={`/topic/${t.slug}`}
                    >
                      {t.name}
                    </Link>
                    <div className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
                      {t._count.quotes}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">/topic/{t.slug}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">No topics found yet.</div>
          )}
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
