export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getQuoteCountByTopic, getQuotesByTopic, getTopicBySlug } from '@/lib/data';

type Props = {
  params: Promise<{ topic: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params;
  const t = await getTopicBySlug(topic);
  if (!t) return { title: 'Topic not found | QuoteTimeline' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${base}/topic/${t.slug}`;

  const title = `${t.name} quotes | QuoteTimeline`;
  const description = `A timeline-style index of sourced quotes tagged “${t.name}”.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

function toPage(s: string | undefined) {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { topic } = await params;
  const sp = (await searchParams) ?? {};
  const page = toPage(sp.page);

  const t = await getTopicBySlug(topic);
  if (!t) return notFound();

  const pageSize = 50;

  const [quotes, totalQuotes] = await Promise.all([
    getQuotesByTopic(topic, { page, pageSize }),
    getQuoteCountByTopic(topic),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Home
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/trending" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
              Trending
            </Link>
            <Link href="/search" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
              Search
            </Link>
          </div>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.name}</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            A timeline-style index of sourced quotes tagged “{t.name}”.
          </p>
        </header>

        <section className="mt-10">
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
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Source:{' '}
                  <a className="underline" href={q.source.url} target="_blank" rel="noreferrer">
                    {q.source.title}
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/topic/${t.slug}?page=${page - 1}`}
              >
                ← Newer
              </Link>
            ) : (
              <div />
            )}

            {page * pageSize < totalQuotes ? (
              <Link
                className="rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                href={`/topic/${t.slug}?page=${page + 1}`}
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
