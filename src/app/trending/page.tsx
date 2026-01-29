import Link from 'next/link';
import { QUOTES, TOPICS } from '@/lib/sample-data';

export default function TrendingPage() {
  // MVP: “trending” = topic frequency across all quotes.
  const counts = new Map<string, number>();
  for (const q of QUOTES) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1);

  const ranked = [...counts.entries()]
    .map(([slug, n]) => ({ slug, n, name: TOPICS.find((t) => t.slug === slug)?.name ?? slug }))
    .sort((a, b) => b.n - a.n);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-slate-600 hover:underline">
        ← Home
      </Link>

      <header className="mt-4 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Trending</h1>
        <p className="text-slate-600">A lightweight snapshot based on currently indexed quotes (sample data).</p>
      </header>

      <section className="mt-8">
        <ul className="space-y-3">
          {ranked.map((x) => (
            <li key={x.slug} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Link className="font-medium" href={`/topic/${x.slug}`}>
                  {x.name}
                </Link>
                <div className="text-sm text-slate-600">{x.n}</div>
              </div>
              <div className="text-xs text-slate-500">/topic/{x.slug}</div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 text-xs text-slate-500">
        Not affiliated with or endorsed by any person or organization.
      </footer>
    </main>
  );
}
