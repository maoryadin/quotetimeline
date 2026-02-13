export const dynamic = 'force-static';

import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = `${base}/about`;

  const title = 'About | QuoteTimeline';
  const description = 'QuoteTimeline is a neutral, source-first index of verbatim public quotes with dates and primary sources.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            QuoteTimeline is an informational index of verbatim public quotes with dates and links to primary sources.
            It is not affiliated with or endorsed by any person or organization.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Neutral positioning</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              The goal is readability and traceability: every quote links back to a primary source.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">What’s on the roadmap</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              More real ingestion sources, better topic timelines, and market windows that load fast and stay cached.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick links</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
            <li>
              <Link className="text-indigo-700 hover:underline dark:text-indigo-300" href="/sources">
                Data sources
              </Link>
            </li>
            <li>
              <Link className="text-indigo-700 hover:underline dark:text-indigo-300" href="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
