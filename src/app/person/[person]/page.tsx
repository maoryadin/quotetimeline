import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { PEOPLE, QUOTES, slugifyQuote, TOPICS } from '@/lib/sample-data';

type Props = { params: Promise<{ person: string }> };

export default async function PersonPage({ params }: Props) {
  const { person } = await params;
  const p = PEOPLE.find((x) => x.slug === person);
  if (!p) return notFound();

  const quotes = QUOTES.filter((q) => q.personSlug === person).sort((a, b) => (a.date < b.date ? 1 : -1));

  const topicCounts = new Map<string, number>();
  for (const q of quotes) for (const t of q.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);

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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{p.name}</h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{p.description}</p>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Top topics</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <li
                key={t.slug}
                className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
              >
                <Link className="block" href={`/topic/${t.slug}`}>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {topicCounts.get(t.slug) ?? 0} quotes (sample)
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Quotes</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3">
            {quotes.map((q) => {
              const slug = slugifyQuote(q.text, q.date);
              return (
                <li
                  key={q.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                >
                  <Link href={`/quote/${slug}`} className="block">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{q.date}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{q.source.publisher ?? 'Source'}</div>
                    </div>
                    <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{q.text}”</div>
                    {q.context ? (
                      <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{q.context}</div>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
