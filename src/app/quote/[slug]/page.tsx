export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getPersonBySlug, getQuoteBySlug, getRelatedQuotes, getTopics } from '@/lib/data';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const q = await getQuoteBySlug(slug);
  if (!q) return { title: 'Quote not found | QuoteTimeline' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${base}/quote/${q.slug}`;

  const person = await getPersonBySlug(q.personSlug);
  const personName = person?.name ?? q.personSlug;

  const title = `“${q.text}” — ${personName} | QuoteTimeline`;
  const description = q.context
    ? q.context
    : `A sourced quote from ${personName}${q.source.publisher ? ` (${q.source.publisher})` : ''}.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function QuotePage({ params }: Props) {
  const { slug } = await params;
  const q = await getQuoteBySlug(slug);
  if (!q) return notFound();

  const [related, topics, person] = await Promise.all([
    getRelatedQuotes(slug, 8),
    getTopics(),
    getPersonBySlug(q.personSlug),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonicalUrl = `${base}/quote/${q.slug}`;

  // Minimal JSON-LD to help search engines understand the entity.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quotation',
    '@id': canonicalUrl,
    url: canonicalUrl,
    text: q.text,
    datePublished: q.date,
    author: {
      '@type': 'Person',
      name: person?.name ?? q.personSlug,
      url: `${base}/person/${q.personSlug}`,
    },
    isBasedOn: q.source.url,
    about: q.topics.map((tSlug) => {
      const t = topics.find((x) => x.slug === tSlug);
      return {
        '@type': 'Thing',
        name: t?.name ?? tSlug,
        url: `${base}/topic/${tSlug}`,
      };
    }),
  };

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/person/${q.personSlug}`} className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Back
          </Link>
          <Link href="/search" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            Search →
          </Link>
        </div>

        <article className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
              Date: <span className="font-medium text-slate-900 dark:text-slate-100">{q.date}</span>
            </div>
            <div className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
              Source type: <span className="font-medium text-slate-900 dark:text-slate-100">{q.source.type}</span>
            </div>
            {q.source.publisher ? (
              <div className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                Publisher: <span className="font-medium text-slate-900 dark:text-slate-100">{q.source.publisher}</span>
              </div>
            ) : null}
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">“{q.text}”</h1>

          {q.context ? <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-200">{q.context}</p> : null}

          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Primary source</div>
            <a
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              href={q.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
              <span className="text-white/70 dark:text-slate-500">→</span>
            </a>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{q.source.title}</div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Topics</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.topics.map((tSlug) => {
                const t = topics.find((x) => x.slug === tSlug);
                return (
                  <Link
                    key={tSlug}
                    className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-900 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                    href={`/topic/${tSlug}`}
                  >
                    {t?.name ?? tSlug}
                  </Link>
                );
              })}
            </div>
          </div>
        </article>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Related</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3">
            {related.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:focus-within:ring-offset-black"
              >
                <Link href={`/quote/${r.slug}`} className="block">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{r.date}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{r.source.publisher ?? 'Source'}</div>
                  </div>
                  <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{r.text}”</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
