export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchBar } from '@/components/SearchBar';
import { getPersonBySlug, getQuoteCountByPerson, getQuotesByPerson, getTopTopicsByPerson } from '@/lib/data';

function toPage(s: string | undefined) {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

type Props = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);

  const trumpSlug = 'donald-trump';
  const pageSize = 50;

  const p = await getPersonBySlug(trumpSlug);
  if (!p) return notFound();

  const [quotes, topTopics, totalQuotes] = await Promise.all([
    getQuotesByPerson(trumpSlug, { page, pageSize }),
    getTopTopicsByPerson(trumpSlug, 12),
    getQuoteCountByPerson(trumpSlug),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Trump timeline • Verbatim quotes • Primary sources
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{p.name} timeline (sourced quotes)</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              {p.description ?? 'A neutral, source-first index of public statements.'} Click any quote to see the original source.
            </p>

            <div className="mt-6">
              <SearchBar />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                href="#quotes"
              >
                Browse quotes
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
            <h2 className="text-lg font-semibold">Top topics</h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">Jump into a topic timeline</div>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topTopics.map((t) => (
              <li
                key={t.slug}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
              >
                <Link className="block" href={`/topic/${t.slug}`}>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.n} quotes</div>
                </Link>
              </li>
            ))}
          </ul>

          {!topTopics.length ? <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">No topics yet.</div> : null}
        </section>

        <section className="mt-10" id="quotes">
          <h2 className="text-lg font-semibold">Quotes</h2>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Page {page} of {Math.max(1, Math.ceil(totalQuotes / pageSize))} • {totalQuotes} total
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3">
            {quotes.map((q) => (
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

          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/?page=${page - 1}#quotes`}
              >
                ← Newer
              </Link>
            ) : (
              <div />
            )}

            {page * pageSize < totalQuotes ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/?page=${page + 1}#quotes`}
              >
                Older →
              </Link>
            ) : (
              <div />
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data note: this build reads from Postgres (seeded with a small, source-backed starter set).
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
