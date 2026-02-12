export const dynamic = 'force-static';

import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const canonical = `${base}/contact`;

  const title = 'Contact | QuoteTimeline';
  const description = 'Report broken sources or suggest new corpuses for QuoteTimeline.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-6 py-10">
        <header className="rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Contact</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            QuoteTimeline is early-stage. If you find a broken primary-source link, a duplicated quote, or want to suggest an additional
            source corpus, send details.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-200/70 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            Email:
            <div className="mt-2 rounded-xl border border-slate-200/70 bg-white/70 p-4 font-mono text-sm dark:border-white/10 dark:bg-black/20">
              contact@quotetimeline.example
            </div>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Replace this placeholder with a real inbox when ready (and update the site footer).
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
