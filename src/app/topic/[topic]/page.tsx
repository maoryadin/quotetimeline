export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getQuotesByTopic, getTopicBySlug } from '@/lib/data';

type Props = { params: Promise<{ topic: string }> };

export default async function TopicPage({ params }: Props) {
  const { topic } = await params;
  const t = await getTopicBySlug(topic);
  if (!t) return notFound();

  const quotes = await getQuotesByTopic(topic);

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
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
