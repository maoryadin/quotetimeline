import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getQuoteBySlug, slugifyQuote, QUOTES, TOPICS } from '@/lib/sample-data';

type Props = { params: Promise<{ slug: string }> };

export default async function QuotePage({ params }: Props) {
  const { slug } = await params;
  const q = getQuoteBySlug(slug);
  if (!q) return notFound();

  const related = QUOTES.filter(
    (x) => x.id !== q.id && (x.personSlug === q.personSlug || x.topics.some((t) => q.topics.includes(t)))
  )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
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
              rel="noreferrer"
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
                const t = TOPICS.find((x) => x.slug === tSlug);
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
            {related.map((r) => {
              const rSlug = slugifyQuote(r.text, r.date);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/20"
                >
                  <Link href={`/quote/${rSlug}`} className="block">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.date}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{r.source.publisher ?? 'Source'}</div>
                    </div>
                    <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{r.text}”</div>
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
