export const dynamic = 'force-static';

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = `${base}/sources`;

  const title = 'Sources | QuoteTimeline';
  const description = 'Primary sources for quotes and market-window data providers used by QuoteTimeline.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function SourcesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <header className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sources</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            QuoteTimeline links directly to primary sources wherever possible. Market windows use free daily data and are cached in the
            database to avoid repeated external calls.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Quotes</div>
            <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">Primary-source links per quote</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Every quote page includes a “Primary source” button pointing to the original URL (transcript, video, post, or article).
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Example corpus starter: archived White House “Remarks” pages (2017–2021). The ingest script stores the original post URL as
              the Source.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Markets</div>
            <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">Stooq CSV (daily)</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Market windows currently fetch daily close series from Stooq (free CSV endpoint) for SPX and VIX.
              Results are cached as daily points in Postgres.
            </p>
            <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              <a
                className="text-indigo-700 hover:underline dark:text-indigo-300"
                href="https://stooq.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://stooq.com/
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Questions</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              If you spot a broken primary-source link or want to suggest an additional canonical corpus, use the contact page.
            </p>
            <Link className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300" href="/contact">
              Contact →
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
