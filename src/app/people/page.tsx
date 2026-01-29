export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getPeople } from '@/lib/data';

export default async function PeoplePage() {
  const people = await getPeople();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            ← Home
          </Link>
          <Link href="/search" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
            Search →
          </Link>
        </div>

        <header className="mt-6 rounded-3xl border border-slate-200/70 bg-white/60 p-8 shadow-sm dark:border-white/10 dark:bg-black/20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">People</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            Browse people with indexed quotes.
          </p>
        </header>

        <section className="mt-10">
          {people.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {people.map((p) => (
                <li
                  key={p.slug}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                >
                  <Link className="block" href={`/person/${p.slug}`}
                  >
                    <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                    {p.description ? (
                      <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{p.description}</div>
                    ) : (
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">View timeline</div>
                    )}
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">/person/{p.slug}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">No people found yet.</div>
          )}
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
