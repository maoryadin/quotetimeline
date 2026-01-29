import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/person/${q.personSlug}`} className="text-sm text-slate-600 hover:underline">
        ← Back
      </Link>

      <article className="mt-4 rounded-xl border p-6">
        <div className="text-sm text-slate-500">{q.date}</div>
        <h1 className="mt-2 text-2xl font-semibold leading-snug">“{q.text}”</h1>

        {q.context ? <p className="mt-4 text-slate-700">{q.context}</p> : null}

        <div className="mt-5 text-sm">
          <div className="text-slate-500">Source</div>
          <a className="underline" href={q.source.url} target="_blank" rel="noreferrer">
            {q.source.title}
          </a>
          <div className="mt-1 text-xs text-slate-500">
            Type: {q.source.type}
            {q.source.publisher ? ` · Publisher: ${q.source.publisher}` : ''}
          </div>
        </div>

        <div className="mt-5 text-sm">
          <div className="text-slate-500">Topics</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.topics.map((tSlug) => {
              const t = TOPICS.find((x) => x.slug === tSlug);
              return (
                <Link key={tSlug} className="rounded-full border px-3 py-1 text-xs" href={`/topic/${tSlug}`}>
                  {t?.name ?? tSlug}
                </Link>
              );
            })}
          </div>
        </div>
      </article>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Related</h2>
        <ul className="mt-3 space-y-3">
          {related.map((r) => {
            const rSlug = slugifyQuote(r.text, r.date);
            return (
              <li key={r.id} className="rounded-lg border p-4">
                <Link href={`/quote/${rSlug}`} className="block">
                  <div className="text-sm text-slate-500">{r.date}</div>
                  <div className="mt-1 text-base">“{r.text}”</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-10 text-xs text-slate-500">
        Not affiliated with or endorsed by any person or organization. Always verify using the linked source.
      </footer>
    </main>
  );
}
