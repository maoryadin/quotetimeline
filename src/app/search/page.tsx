export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import { searchQuotes } from '@/lib/data';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q = '' } = await searchParams;
  const query = (q ?? '').trim();

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = `${base}/search`;

  // Important for SEO: prevent indexing of arbitrary query pages.
  // (We still allow crawling of the rest of the site.)
  const title = query ? `Search “${query}” | QuoteTimeline` : 'Search | QuoteTimeline';
  const description = 'Search across indexed quote text, context, sources, and people.';

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams;
  const query = (q ?? '').trim();
  const results = query ? await searchQuotes(query) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
          ← Home
        </Link>
      </div>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Find quotes by keyword across text, context, sources, and people.</p>
        <div className="mt-6">
          <SearchBar initialQuery={query} />
        </div>
      </header>

      <section className="mt-10">
        {query ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">{results.length} results</div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">Type something to search.</div>
        )}

        <ul className="mt-4 grid grid-cols-1 gap-3">
          {results.map((r) => (
            <li
              key={r.id}
              className="group rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
            >
              <Link href={`/quote/${r.slug}`} className="block">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{r.date}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{r.source.publisher ?? 'Source'}</div>
                  </div>
                  <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{r.text}”</div>
                  {r.context ? (
                    <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{r.context}</div>
                  ) : null}
                </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
