export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchBar } from '@/components/SearchBar';
import { getLatestQuotes, getPeople, getTopics } from '@/lib/data';

export default async function Home() {
  const people = await getPeople();
  const topics = await getTopics();
  const latest = await getLatestQuotes(6);
  const featured = people[0];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Source-first • Verbatim quotes
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Find the quote. Check the date. Click the source.
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              QuoteTimeline is a neutral index of public statements with links to primary sources.
            </p>

            <div className="mt-6">
              <SearchBar />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                href={featured ? `/person/${featured.slug}` : '/search'}
              >
                Browse {featured?.name ?? 'quotes'}
              </Link>
              <Link
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                href="/trending"
              >
                See what’s trending
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold">Topics</h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">Pick a lane → then drill down by date</div>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topics.map((t) => (
              <li
                key={t.slug}
                className="group rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-black/20"
              >
                <Link className="block" href={`/topic/${t.slug}`}>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Timeline + sourced quotes</div>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">/topic/{t.slug}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold">Latest quotes</h2>
            {featured ? (
              <Link className="text-sm text-indigo-700 hover:underline dark:text-indigo-300" href={`/person/${featured.slug}`}>
                View all →
              </Link>
            ) : null}
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3">
            {latest.map((q) => (
              <li
                key={q.id}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
              >
                <Link href={`/quote/${q.slug}`} className="block">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{q.date}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{q.source.publisher ?? 'Source'}</div>
                    </div>
                    <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{q.text}”</div>
                    {q.context ? (
                      <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{q.context}</div>
                    ) : null}
                  </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data note: this build reads from Postgres (seeded with a small, source-backed starter set).
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
