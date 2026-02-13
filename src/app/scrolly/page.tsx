export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TrumpScrolly, type NarrativeBlock } from '@/components/TrumpScrolly';
import { getPersonBySlug, getQuotesByPerson } from '@/lib/data';
import { TRUMP_SLUG } from '@/lib/trump';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = `${base}/scrolly`;

  const title = 'Trump timeline — scrollytelling mode (sticky market window) | QuoteTimeline';
  const description = 'Scroll a Trump quote feed while a sticky 7-day market window updates to the active quote date.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

const NARRATIVE_BLOCKS: NarrativeBlock[] = [
  {
    atIndex: 0,
    title: 'How to read this page',
    body: 'As you scroll through quotes, the market chart on the right automatically snaps to a 7-day window around the active quote date. Use “Copy link” on any card to share the exact scroll position.',
  },
  {
    atIndex: 12,
    title: 'Sources first',
    body: 'Each quote links to its primary source. This is intended as a neutral index: text + date + source, without editorializing.',
  },
];

export default async function ScrollyPage() {
  const trumpSlug = TRUMP_SLUG;

  const p = await getPersonBySlug(trumpSlug);
  if (!p) return notFound();

  // Scrolly mode is meant to feel continuous. Start with a bigger chunk than the homepage.
  const quotes = await getQuotesByPerson(trumpSlug, { page: 1, pageSize: 100 });

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Scrolly mode</h1>
            <Link href="/" className="qt-focus text-sm text-slate-600 hover:underline dark:text-slate-300">
              ← Back to timeline
            </Link>
          </div>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Scroll quotes; the sticky market window updates to the active quote date. Deep-linking is supported: share a position
            via the URL hash.
          </p>
        </header>

        <section className="mt-8">
          <TrumpScrolly quotes={quotes} narrativeBlocks={NARRATIVE_BLOCKS} />
        </section>

        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">Showing the latest 100 quotes. For older pages, use the main timeline pagination.</div>

        <SiteFooter />
      </main>
    </>
  );
}
