import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TOPICS, QUOTES, slugifyQuote } from '@/lib/sample-data';

type Props = { params: Promise<{ topic: string }> };

export default async function TopicPage({ params }: Props) {
  const { topic } = await params;
  const t = TOPICS.find((x) => x.slug === topic);
  if (!t) return notFound();

  const quotes = QUOTES.filter((q) => q.topics.includes(topic)).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-600 hover:underline">
          ← Home
        </Link>
        <Link href="/trending" className="text-sm text-slate-600 hover:underline">
          Trending →
        </Link>
      </div>

      <header className="mt-4 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t.name}</h1>
        <p className="text-slate-600">A timeline-style index of sourced quotes tagged “{t.name}”.</p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Quotes</h2>
        <ul className="mt-3 space-y-3">
          {quotes.map((q) => {
            const slug = slugifyQuote(q.text, q.date);
            return (
              <li key={q.id} className="rounded-lg border p-4">
                <Link href={`/quote/${slug}`} className="block">
                  <div className="text-sm text-slate-500">{q.date}</div>
                  <div className="mt-1 text-base">“{q.text}”</div>
                </Link>
                <div className="mt-2 text-xs text-slate-500">
                  Source:{' '}
                  <a className="underline" href={q.source.url} target="_blank" rel="noreferrer">
                    {q.source.publisher ?? 'Source'}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
