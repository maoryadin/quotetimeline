export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getPersonBySlug, getQuoteCountByPerson, getQuotesByPerson, getTopTopicsByPerson } from '@/lib/data';

type Props = {
  params: Promise<{ person: string }>;
  searchParams?: Promise<{ page?: string }>;
};

const TRUMP_SLUG = 'donald-trump';

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { person } = await params;
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);

  // UX pivot: we are Trump-first for now.
  if (person !== TRUMP_SLUG) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return {
      title: 'QuoteTimeline',
      alternates: { canonical: `${base}/` },
      robots: { index: false, follow: true },
    };
  }

  const p = await getPersonBySlug(person);
  if (!p) return { title: 'Person not found | QuoteTimeline' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = page > 1 ? `${base}/person/${p.slug}?page=${page}` : `${base}/person/${p.slug}`;

  const title = `${p.name} quotes | QuoteTimeline`;
  const description = p.description ?? `A timeline-style index of sourced quotes by ${p.name}.`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: page > 1 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary', title, description },
  };
}

function toPage(s: string | undefined) {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

export default async function PersonPage({ params, searchParams }: Props) {
  const { person } = await params;

  // UX pivot: keep the route around for backwards compat, but focus the product on Trump.
  if (person !== TRUMP_SLUG) {
    redirect('/');
  }

  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);

  const p = await getPersonBySlug(person);
  if (!p) return notFound();

  const pageSize = 50;

  const [quotes, topTopics, totalQuotes] = await Promise.all([
    getQuotesByPerson(person, { page, pageSize }),
    getTopTopicsByPerson(person, 12),
    getQuoteCountByPerson(person),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Home
          </Link>
          <Link href="/search" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            Search →
          </Link>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{p.name}</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{p.description}</p>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Top topics</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topTopics.map((t) => (
              <li
                key={t.slug}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:focus-within:ring-offset-black"
              >
                <Link className="block" href={`/topic/${t.slug}`}>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.n} quotes</div>
                </Link>
              </li>
            ))}
          </ul>

          {!topTopics.length ? (
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">No topics yet.</div>
          ) : null}
        </section>

        <section className="mt-10">
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
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/person/${p.slug}?page=${page - 1}`}
              >
                ← Newer
              </Link>
            ) : (
              <div />
            )}

            {page * pageSize < totalQuotes ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/person/${p.slug}?page=${page + 1}`}
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
