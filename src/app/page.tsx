export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchBar } from '@/components/SearchBar';
import { TrumpScrolly } from '@/components/TrumpScrolly';
import { getPersonBySlug, getQuoteCountByPerson, getQuotesByPerson, getTopTopicsByPerson, getYearsForPerson } from '@/lib/data';
import { TRUMP_SLUG } from '@/lib/trump';

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

type Props = {
  searchParams?: Promise<{ page?: string; year?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);
  const year = toYear(sp.year);

  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (year) params.set('year', String(year));

  const canonical = params.size ? `${base}/?${params.toString()}` : `${base}/`;

  const title = year
    ? `Trump timeline (${year}) — sourced quotes | QuoteTimeline`
    : 'Donald J. Trump timeline (sourced quotes) | QuoteTimeline';
  const description = year
    ? `A neutral, source-first timeline of verbatim public quotes by Donald J. Trump in ${year}, with dates and primary sources.`
    : 'A neutral, source-first timeline of verbatim public quotes by Donald J. Trump, with dates and primary sources.';

  return {
    title,
    description,
    alternates: { canonical },
    robots: page > 1 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);
  const year = toYear(sp.year);

  const trumpSlug = TRUMP_SLUG;
  const pageSize = 50;

  const pageHref = (targetPage: number, nextYear?: number | null) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set('page', String(targetPage));
    const y = nextYear ?? year;
    if (y) params.set('year', String(y));
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  const p = await getPersonBySlug(trumpSlug);
  if (!p) return notFound();

  const [quotes, topTopics, totalQuotes, years] = await Promise.all([
    getQuotesByPerson(trumpSlug, { page, pageSize }, { year: year ?? undefined }),
    getTopTopicsByPerson(trumpSlug, 12),
    getQuoteCountByPerson(trumpSlug, { year: year ?? undefined }),
    getYearsForPerson(trumpSlug),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-10 sm:px-6">
        <section className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Trump timeline • Verbatim quotes • Primary sources
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{p.name} timeline</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              {p.description ?? 'A neutral, source-first index of public statements.'} Scroll the timeline and watch the sticky 7-day
              market window update as you move from quote to quote.
            </p>

            <div className="mt-6">
              <SearchBar />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                className="qt-focus rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                href="#quotes"
              >
                Start scrolling
              </Link>
              <Link
                className="qt-focus rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                href="/story"
              >
                Story mode (100 quotes)
              </Link>
              <Link
                className="qt-focus rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                href="/trending"
              >
                Trending topics
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 scroll-mt-24" id="quotes">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-lg font-semibold">Timeline</h2>

              {years.length ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="sr-only">Filter timeline by year</span>
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
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300">
              Page {page} of {Math.max(1, Math.ceil(totalQuotes / pageSize))} • {totalQuotes} total
            </div>
          </div>

          <div className="mt-5">
            <TrumpScrolly quotes={quotes} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                className="qt-focus rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`${pageHref(page - 1)}#quotes`}
              >
                ← Newer
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}

            {page * pageSize < totalQuotes ? (
              <Link
                className="qt-focus rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`${pageHref(page + 1)}#quotes`}
              >
                Older →
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data note: this build reads from Postgres (seeded with a small, source-backed starter set).
          </div>
        </section>

        <section className="mt-12 scroll-mt-24" id="topics">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold">Top topics</h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">Jump into a topic timeline</div>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topTopics.map((t) => (
              <li
                key={t.slug}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-[rgb(var(--background))] dark:border-white/10 dark:bg-black/20"
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

        <SiteFooter />
      </main>
    </>
  );
}
