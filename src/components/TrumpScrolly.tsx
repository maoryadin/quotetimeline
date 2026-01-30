'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { QuoteView } from '@/lib/data';
import { MarketMiniChart } from '@/components/MarketMiniChart';

type Props = {
  quotes: QuoteView[];
};

export function TrumpScrolly({ quotes }: Props) {
  const [activeId, setActiveId] = useState<string | null>(quotes[0]?.id ?? null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const activeQuote = useMemo(() => {
    const q = quotes.find((x) => x.id === activeId);
    return q ?? quotes[0] ?? null;
  }, [activeId, quotes]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-quote-id]'));
    if (!cards.length) return;

    // IntersectionObserver callbacks only include entries that changed.
    // To reliably pick the "active" card, keep our own visibility cache.
    const state = new Map<string, IntersectionObserverEntry>();

    const pickActive = () => {
      const centerY = window.innerHeight / 2;

      const visible = Array.from(state.entries())
        .filter(([, e]) => e.isIntersecting)
        .map(([id, e]) => {
          const rect = e.boundingClientRect;
          const cardCenterY = rect.top + rect.height / 2;
          const distance = Math.abs(cardCenterY - centerY);
          return { id, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      const best = visible[0];
      if (best?.id) setActiveId(best.id);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement | undefined)?.dataset.quoteId;
          if (!id) continue;
          state.set(id, e);
        }
        pickActive();
      },
      {
        root: null,
        // Trigger when the card crosses the middle-ish of the viewport.
        rootMargin: '-40% 0px -45% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of cards) obs.observe(el);

    return () => obs.disconnect();
  }, [quotes]);

  if (!quotes.length) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">No quotes yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]" ref={rootRef}>
      <div className="space-y-3">
        {quotes.map((q) => {
          const isActive = q.id === activeId;
          return (
            <article
              key={q.id}
              data-quote-id={q.id}
              className={
                'rounded-2xl border bg-white/60 p-5 shadow-sm transition-colors dark:bg-black/20 ' +
                (isActive
                  ? 'border-indigo-300/70 bg-white shadow-md dark:border-white/20'
                  : 'border-slate-200/70 hover:bg-white dark:border-white/10')
              }
            >
              <Link href={`/quote/${q.slug}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{q.date}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{q.source.publisher ?? 'Source'}</div>
                </div>
                <div className="mt-2 text-base leading-snug text-slate-900 dark:text-slate-100">“{q.text}”</div>
                {q.context ? (
                  <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{q.context}</div>
                ) : null}
              </Link>
            </article>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Market window</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {activeQuote ? (
              <>
                <div className="font-semibold">7D around {activeQuote.date}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sticky chart updates as you scroll.</div>
                <Link
                  href={`/quote/${activeQuote.slug}`}
                  className="mt-2 block text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                >
                  Open active quote →
                </Link>
              </>
            ) : null}
          </div>

          <div className="mt-4">
            {activeQuote ? <MarketMiniChart anchorDate={activeQuote.date} /> : null}
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data note: MVP uses free market proxies (SPY, VXX) and caches daily points in Postgres.
          </div>
        </div>
      </aside>
    </div>
  );
}
