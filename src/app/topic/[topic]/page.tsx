export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getQuoteCountByTopic, getQuotesByTopic, getTopicBySlug, getYearsForTopic } from '@/lib/data';

type Props = {
  params: Promise<{ topic: string }>;
  searchParams?: Promise<{ page?: string; year?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { topic } = await params;
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);
  const year = toYear(sp.year);

  const t = await getTopicBySlug(topic);
  if (!t) return { title: 'Topic not found | QuoteTimeline' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const paramsOut = new URLSearchParams();
  if (page > 1) paramsOut.set('page', String(page));
  if (year) paramsOut.set('year', String(year));

  const canonical = paramsOut.size ? `${base}/topic/${t.slug}?${paramsOut.toString()}` : `${base}/topic/${t.slug}`;

  const title = year ? `${t.name} quotes (${year}) | QuoteTimeline` : `${t.name} quotes | QuoteTimeline`;
  const description = year
    ? `A timeline-style index of sourced quotes tagged “${t.name}” in ${year}.`
    : `A timeline-style index of sourced quotes tagged “${t.name}”.`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: page > 1 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

function toPage(s: string | undefined) {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

function toYear(s: string | undefined) {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const year = Math.floor(n);
  if (year < 1900 || year > 2100) return null;
  return year;
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { topic } = await params;
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);
  const year = toYear(sp.year);

  const t = await getTopicBySlug(topic);
  if (!t) return notFound();

  const pageSize = 50;

  const pageHref = (targetPage: number, nextYear?: number | null) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set('page', String(targetPage));
    const y = nextYear ?? year;
    if (y) params.set('year', String(y));
    const qs = params.toString();
    return qs ? `/topic/${t.slug}?${qs}` : `/topic/${t.slug}`;
  };

  const [quotes, totalQuotes, years] = await Promise.all([
    getQuotesByTopic(topic, { page, pageSize }, { year: year ?? undefined }),
    getQuoteCountByTopic(topic, { year: year ?? undefined }),
    getYearsForTopic(topic),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Home
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/trending" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
              Trending
            </Link>
            <Link href="/search" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
              Search
            </Link>
          </div>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.name}</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            {year ? (
              <>A timeline-style index of sourced quotes tagged “{t.name}” in {year}.</>
            ) : (
              <>A timeline-style index of sourced quotes tagged “{t.name}”.</>
            )}
          </p>

          {years.length ? (
            <div className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              <span className="sr-only">Filter topic timeline by year</span>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 dark:border-white/10 dark:bg-black/20">
                <span className="font-medium text-slate-600 dark:text-slate-300">Year</span>
                <div className="h-3 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={pageHref(page, null)}
                    className={
                      'qt-focus rounded-full px-2 py-0.5 text-[11px] ' +
                      (year == null
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 hover:underline dark:text-slate-300')
                    }
                  >
                    All
                  </Link>

                  {years.slice(0, 6).map((y) => (
                    <Link
                      key={y.year}
                      href={pageHref(page, y.year)}
                      className={
                        'qt-focus rounded-full px-2 py-0.5 text-[11px] ' +
                        (year === y.year
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'text-slate-600 hover:underline dark:text-slate-300')
                      }
                      aria-current={year === y.year ? 'true' : undefined}
                    >
                      {y.year}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <section className="mt-10" id="quotes">
          <h2 className="text-lg font-semibold">Quotes</h2>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Page {page} of {Math.max(1, Math.ceil(totalQuotes / pageSize))} • {totalQuotes} total
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:focus-within:ring-offset-black"
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
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Source:{' '}
                  <a
                    className="qt-focus underline"
                    href={q.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {q.source.title}
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                className="qt-focus rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={pageHref(page - 1) + '#quotes'}
              >
                ← Newer
              </Link>
            ) : (
              <div />
            )}

            {page * pageSize < totalQuotes ? (
              <Link
                className="qt-focus rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={pageHref(page + 1) + '#quotes'}
              >
                Older →
              </Link>
            ) : (
              <div />
            )}
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
