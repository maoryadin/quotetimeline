'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { QuoteView } from '@/lib/data';
import { MarketMiniChart } from '@/components/MarketMiniChart';

export type NarrativeBlock = {
  /** Insert a narrative card before quotes[atIndex]. */
  atIndex: number;
  title: string;
  body: string;
};

type Props = {
  quotes: QuoteView[];
  narrativeBlocks?: NarrativeBlock[];
};

type FeedItem =
  | { kind: 'year'; year: string; key: string }
  | { kind: 'narrative'; title: string; body: string; key: string }
  | { kind: 'quote'; quote: QuoteView; key: string };

export function TrumpScrolly({ quotes, narrativeBlocks }: Props) {
  const parseSlugFromHash = (rawHash: string) => {
    const hash = rawHash.replace(/^#/, '');
    const encoded = hash.startsWith('q=') ? hash.slice(2) : hash.startsWith('quote-') ? hash.slice('quote-'.length) : '';
    if (!encoded) return '';

    // Hash fragments might be URI-encoded (because slugs can contain spaces/utf8 in the future).
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  };

  const [activeId, setActiveId] = useState<string | null>(() => {
    const first = quotes[0]?.id ?? null;
    if (!first) return null;
    if (typeof window === 'undefined') return first;

    const slug = parseSlugFromHash(window.location.hash);
    if (!slug) return first;

    const target = quotes.find((q) => q.slug === slug);
    return target?.id ?? first;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const activeQuote = useMemo(() => {
    const q = quotes.find((x) => x.id === activeId);
    return q ?? quotes[0] ?? null;
  }, [activeId, quotes]);

  const feedItems: FeedItem[] = useMemo(() => {
    let lastYear = '';
    const items: FeedItem[] = [];

    const blocks = (narrativeBlocks ?? [])
      .filter((b) => Number.isFinite(b.atIndex))
      .slice()
      .sort((a, b) => a.atIndex - b.atIndex);

    let blockIdx = 0;

    for (let i = 0; i < quotes.length; i++) {
      while (blockIdx < blocks.length && blocks[blockIdx]!.atIndex === i) {
        const b = blocks[blockIdx]!;
        items.push({ kind: 'narrative', title: b.title, body: b.body, key: `narrative-${b.atIndex}-${blockIdx}` });
        blockIdx++;
      }

      const q = quotes[i]!;
      const year = (q.date || '').slice(0, 4) || 'Unknown year';
      if (year !== lastYear) {
        items.push({ kind: 'year', year, key: `year-${year}` });
        lastYear = year;
      }
      items.push({ kind: 'quote', quote: q, key: q.id });
    }

    // Trailing blocks (atIndex >= quotes.length)
    while (blockIdx < blocks.length) {
      const b = blocks[blockIdx]!;
      items.push({ kind: 'narrative', title: b.title, body: b.body, key: `narrative-${b.atIndex}-${blockIdx}` });
      blockIdx++;
    }

    return items;
  }, [quotes, narrativeBlocks]);

  // Keep the URL hash in sync with the active quote so scrolly positions are shareable.
  // Debounce to avoid jank while the IntersectionObserver rapidly changes "active" during fast scroll.
  useEffect(() => {
    if (!activeQuote) return;

    const next = `#q=${encodeURIComponent(activeQuote.slug)}`;
    if (window.location.hash === next) return;

    const t = window.setTimeout(() => {
      if (window.location.hash !== next) window.history.replaceState(null, '', next);
    }, 200);

    return () => window.clearTimeout(t);
  }, [activeQuote]);

  const [isDesktop, setIsDesktop] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  useEffect(() => {
    if (!copiedSlug) return;
    const t = window.setTimeout(() => setCopiedSlug(null), 1200);
    return () => window.clearTimeout(t);
  }, [copiedSlug]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // If the page loads with a hash, scroll that quote into view inside the feed.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !quotes.length) return;

    const slug = parseSlugFromHash(window.location.hash);
    if (!slug) return;

    const target = quotes.find((q) => q.slug === slug);
    if (!target) return;

    requestAnimationFrame(() => {
      const el = feed.querySelector<HTMLElement>(`[data-quote-id="${target.id}"]`);
      el?.scrollIntoView({ block: 'center' });
    });
  }, [quotes, isDesktop]);

  useEffect(() => {
    const root = rootRef.current;
    const feed = feedRef.current;
    if (!root || !feed) return;

    const cards = Array.from(feed.querySelectorAll<HTMLElement>('[data-quote-id]'));
    if (!cards.length) return;

    // IntersectionObserver callbacks only include entries that changed.
    // To reliably pick the "active" card, keep our own visibility cache.
    const state = new Map<string, IntersectionObserverEntry>();

    // Throttle "pick active" to animation frames to avoid doing layout work for every IO callback.
    let raf: number | null = null;

    const pickActive = () => {
      raf = null;

      const centerY = isDesktop
        ? (() => {
            const feedRect = feed.getBoundingClientRect();
            return feedRect.top + feed.clientHeight / 2;
          })()
        : window.innerHeight / 2;

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
      if (!best?.id) return;

      setActiveId((prev) => (prev === best.id ? prev : best.id));
    };

    const schedulePickActive = () => {
      if (raf != null) return;
      raf = window.requestAnimationFrame(pickActive);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement | undefined)?.dataset.quoteId;
          if (!id) continue;
          state.set(id, e);
        }
        schedulePickActive();
      },
      {
        // On desktop, the quote feed scrolls independently so the market panel can stay sticky.
        // On mobile, fall back to the viewport as the scroll container.
        root: isDesktop ? feed : null,
        // Trigger when the card crosses the middle-ish of the scroll container.
        rootMargin: isDesktop ? '-40% 0px -45% 0px' : '-35% 0px -55% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of cards) obs.observe(el);

    return () => {
      if (raf != null) window.cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [quotes, isDesktop]);

  if (!quotes.length) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">No quotes yet.</div>;
  }

  const scrollBehavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]" ref={rootRef}>
      <aside className="order-1 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm lg:h-full dark:border-white/10 dark:bg-black/20">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Market window</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {activeQuote ? (
              <>
                <div className="font-semibold">7D around {activeQuote.date}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">The chart stays put while you scroll the timeline.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/quote/${activeQuote.slug}`}
                    className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:text-indigo-300 dark:hover:bg-black/30 dark:focus-visible:ring-offset-black"
                  >
                    Open quote
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const feed = feedRef.current;
                      if (!feed || !activeQuote) return;
                      const el = feed.querySelector<HTMLElement>(`[data-quote-id="${activeQuote.id}"]`);
                      el?.scrollIntoView({ block: 'center', behavior: scrollBehavior });
                    }}
                    className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-black/30 dark:focus-visible:ring-offset-black"
                  >
                    Jump to active
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isDesktop) {
                        const feed = feedRef.current;
                        feed?.scrollTo({ top: 0, behavior: scrollBehavior });
                      } else {
                        window.scrollTo({ top: 0, behavior: scrollBehavior });
                      }
                    }}
                    className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-black/30 dark:focus-visible:ring-offset-black"
                  >
                    Top
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-4" aria-live="polite">
            {activeQuote ? <MarketMiniChart anchorDate={activeQuote.date} /> : null}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
            <div className="font-medium text-slate-700 dark:text-slate-200">How to use this view</div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Scroll the quote feed; the market window updates automatically.</li>
              <li>Use “Copy link” to share the exact scroll position.</li>
              <li>Click a quote to see the primary source.</li>
            </ul>
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data note: MVP uses free market data (S&P 500, VIX) and caches daily points in Postgres.
          </div>
        </div>
      </aside>

      <div ref={feedRef} className="qt-scrollbar order-2 space-y-3 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2 lg:[scrollbar-gutter:stable]">
        {feedItems.map((item) => {
          if (item.kind === 'year') {
            return (
              <div
                key={item.key}
                className="sticky top-0 z-10 -mx-1 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40 dark:text-slate-200"
              >
                {item.year}
              </div>
            );
          }

          if (item.kind === 'narrative') {
            return (
              <section
                key={item.key}
                className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white/80 to-indigo-50/50 p-5 shadow-sm dark:border-white/10 dark:from-black/30 dark:to-indigo-950/20"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Story beat</div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</div>
              </section>
            );
          }

          const q = item.quote;
          const isActive = q.id === activeId;

          return (
            <article
              key={item.key}
              id={`quote-${q.slug}`}
              data-quote-id={q.id}
              className={
                'rounded-2xl border bg-white/60 p-5 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:bg-black/20 dark:focus-within:ring-offset-black ' +
                (isActive ? 'border-indigo-300/70 bg-white shadow-md dark:border-white/20' : 'border-slate-200/70 hover:bg-white dark:border-white/10')
              }
            >
              <div className="space-y-3">
                <Link href={`/quote/${q.slug}`} className="block" aria-current={isActive ? 'true' : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{q.date}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{q.source.publisher ?? 'Source'}</div>
                  </div>
                  <div className="mt-2 text-base leading-relaxed text-slate-900 dark:text-slate-100">
                    “{q.text}”
                    {isActive ? <span className="sr-only"> (active)</span> : null}
                  </div>
                  {q.context ? <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{q.context}</div> : null}
                </Link>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const url = `${window.location.origin}${window.location.pathname}#q=${encodeURIComponent(q.slug)}`;
                      navigator.clipboard
                        .writeText(url)
                        .then(() => setCopiedSlug(q.slug))
                        .catch(() => {
                          // If clipboard permissions fail, at least update the hash.
                          window.location.hash = `q=${encodeURIComponent(q.slug)}`;
                          setCopiedSlug(q.slug);
                        });
                    }}
                    aria-label={`Copy link to quote from ${q.date}`}
                    className="qt-focus rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <span aria-live="polite">{copiedSlug === q.slug ? 'Copied' : 'Copy link'}</span>
                  </button>

                  {q.topics.length ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {q.topics.slice(0, 3).map((t) => (
                        <Link
                          key={t.slug}
                          href={`/topic/${t.slug}`}
                          className="qt-focus rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
                        >
                          {t.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
