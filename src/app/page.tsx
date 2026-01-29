import Link from 'next/link';
import { PEOPLE, SITE, TOPICS, QUOTES, slugifyQuote } from '@/lib/sample-data';

export default function Home() {
  const trump = PEOPLE[0];

  const latest = [...QUOTES]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
        <p className="text-slate-600">{SITE.description}</p>
        <p className="text-xs text-slate-500">
          Not affiliated with or endorsed by any person or organization. Sources are provided for verification.
        </p>
      </header>

      <section className="mt-8 rounded-xl border p-5">
        <h2 className="text-lg font-medium">Start here</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-black px-3 py-2 text-sm text-white" href={`/person/${trump.slug}`}>
            {trump.name}
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm" href="/trending">
            Trending
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Topics</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <li key={t.slug} className="rounded-lg border p-3">
              <Link className="font-medium" href={`/topic/${t.slug}`}>
                {t.name}
              </Link>
              <div className="text-xs text-slate-500">/topic/{t.slug}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Latest quotes (sample data)</h2>
        <ul className="mt-3 space-y-3">
          {latest.map((q) => {
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
        <p className="mt-3 text-xs text-slate-500">
          Replace sample records with real, source-backed entries before launch.
        </p>
      </section>
    </main>
  );
}
