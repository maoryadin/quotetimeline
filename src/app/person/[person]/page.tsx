import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-600 hover:underline">
        ← Home
      </Link>

      <header className="mt-4 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-slate-600">{p.description}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Top topics</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <li key={t.slug} className="rounded-lg border p-3">
              <Link className="font-medium" href={`/topic/${t.slug}`}>
                {t.name}
              </Link>
              <div className="text-xs text-slate-500">{topicCounts.get(t.slug) ?? 0} quotes (sample)</div>
            </li>
          ))}
        </ul>
      </section>

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
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
