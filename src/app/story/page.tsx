export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { TrumpScrolly } from '@/components/TrumpScrolly';
import { getPersonBySlug, getQuotesByPerson } from '@/lib/data';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = `${base}/story`;

  const title = 'Trump timeline — story mode (scrolling market window) | QuoteTimeline';
  const description = 'Scroll a Trump quote feed while a sticky 7D market window updates to the active quote date.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function StoryPage() {
  const trumpSlug = 'donald-trump';

  const p = await getPersonBySlug(trumpSlug);
  if (!p) return notFound();

  // Story mode is meant to feel continuous. Start with a bigger chunk than the homepage.
  const quotes = await getQuotesByPerson(trumpSlug, { page: 1, pageSize: 100 });

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Story mode</h1>
            <Link href="/" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
              ← Back to timeline
            </Link>
          </div>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Scroll quotes; the sticky market window updates to the active quote date. Deep-linking is supported: share a position
            via the URL hash.
          </p>
        </header>

        <section className="mt-8">
          <TrumpScrolly quotes={quotes} />
        </section>

        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Showing the latest 100 quotes. For older pages, use the main timeline pagination.
        </div>

        <SiteFooter />
      </main>
    </>
  );
}
