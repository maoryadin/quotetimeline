'use client';

import { useEffect, useMemo, useState } from 'react';

type Point = { date: string; close: number };

type SeriesResponse = {
  symbol: string;
  points: Point[];
};

type ReactionSummary = {
  spx1dPct: number | null;
  spx7dPct: number | null;
  vix7dDelta: number | null;
};

// Client-side memoization so rapid scrollytelling doesn't spam /api/market.
// Keep a small cap so we don't grow unbounded during long scroll sessions.
const MAX_SERIES_CACHE = 200;
const seriesCache = new Map<string, SeriesResponse>();
const inflight = new Map<string, Promise<Record<string, SeriesResponse | undefined>>>();

function touchCache(key: string, value: SeriesResponse) {
  // Map iteration order is insertion order; delete+set moves the key to the end (LRU-ish).
  if (seriesCache.has(key)) seriesCache.delete(key);
  seriesCache.set(key, value);

  while (seriesCache.size > MAX_SERIES_CACHE) {
    const oldest = seriesCache.keys().next().value as string | undefined;
    if (!oldest) break;
    seriesCache.delete(oldest);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toPolyline(points: Point[], width: number, height: number) {
  if (points.length < 2) return '';

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.close - min) / span) * height;
      return `${x.toFixed(2)},${clamp(y, 0, height).toFixed(2)}`;
    })
    .join(' ');
}

function findIndexOnOrAfter(points: Point[], anchorDate: string): number {
  if (!points.length) return -1;
  const i = points.findIndex((p) => p.date >= anchorDate);
  return i === -1 ? points.length - 1 : i;
}

function calcReactionSummary(anchorDate: string, spx: SeriesResponse, vix: SeriesResponse): ReactionSummary {
  const spxPoints = spx.points;
  const vixPoints = vix.points;

  const i0 = findIndexOnOrAfter(spxPoints, anchorDate);
  const j0 = findIndexOnOrAfter(vixPoints, anchorDate);

  const spx0 = i0 >= 0 ? spxPoints[i0]?.close ?? null : null;
  const spxPrev = i0 > 0 ? spxPoints[i0 - 1]?.close ?? null : null;
  const spxEnd = spxPoints.length ? spxPoints[spxPoints.length - 1]?.close ?? null : null;

  const vix0 = j0 >= 0 ? vixPoints[j0]?.close ?? null : null;
  const vixEnd = vixPoints.length ? vixPoints[vixPoints.length - 1]?.close ?? null : null;

  const spx1dPct = spx0 != null && spxPrev != null && spxPrev !== 0 ? ((spx0 - spxPrev) / spxPrev) * 100 : null;
  const spx7dPct = spx0 != null && spxEnd != null && spx0 !== 0 ? ((spxEnd - spx0) / spx0) * 100 : null;
  const vix7dDelta = vix0 != null && vixEnd != null ? vixEnd - vix0 : null;

  return { spx1dPct, spx7dPct, vix7dDelta };
}

function mockSeries(symbol: string, anchorDate: string): SeriesResponse {
  // Deterministic mock so the scrolly UI stays interactive if /api/market (or the free providers)
  // are temporarily unavailable. Real data is fetched server-side and cached in Postgres.
  const seed = Array.from(`${symbol}:${anchorDate}`).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const base = symbol.includes('vix') ? 18 : symbol.includes('vxx') ? 18 : symbol.includes('spx') ? 6800 : 470;

  const points: Point[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(`${anchorDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);

    const noise = Math.sin((seed + i) * 0.9) * (symbol.includes('vxx') ? 0.9 : 2.5);
    const drift = i * (symbol.includes('vxx') ? 0.08 : 0.6);
    points.push({ date, close: base + drift + noise });
  }

  return { symbol, points };
}

type BatchResponse = {
  anchor: string;
  days: number;
  series: Record<string, SeriesResponse>;
};

async function fetchBatch(anchorDate: string) {
  const symbols = ['^spx', '^vix'];
  const url = `/api/market/batch?symbols=${encodeURIComponent(symbols.join(','))}&anchor=${encodeURIComponent(anchorDate)}&days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`market batch failed: ${res.status}`);
  return (await res.json()) as BatchResponse;
}

async function fetchBatchCached(anchorDate: string) {
  // Cache per-series, but coordinate fetches by anchor so we only hit the API once.
  const key = `batch::${anchorDate}`;

  const cachedSpx = seriesCache.get(`^spx::${anchorDate}`);
  const cachedVix = seriesCache.get(`^vix::${anchorDate}`);
  if (cachedSpx && cachedVix) {
    touchCache(`^spx::${anchorDate}`, cachedSpx);
    touchCache(`^vix::${anchorDate}`, cachedVix);
    return { '^spx': cachedSpx, '^vix': cachedVix };
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = fetchBatch(anchorDate)
    .then((b) => {
      const spx = b.series['^spx'];
      const vix = b.series['^vix'];

      if (spx) touchCache(`^spx::${anchorDate}`, spx);
      if (vix) touchCache(`^vix::${anchorDate}`, vix);

      inflight.delete(key);
      return { '^spx': spx, '^vix': vix };
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, p);
  return p;
}

type Props = {
  anchorDate: string; // YYYY-MM-DD
};

export function MarketMiniChart({ anchorDate }: Props) {
  const [spx, setSpx] = useState<{ anchorDate: string; series: SeriesResponse } | null>(null);
  const [vix, setVix] = useState<{ anchorDate: string; series: SeriesResponse } | null>(null);
  const [dataMode, setDataMode] = useState<'live' | 'mock'>('live');

  useEffect(() => {
    let cancelled = false;

    // Small debounce so quick scroll bursts only fetch the final anchor.
    const t = window.setTimeout(() => {
      fetchBatchCached(anchorDate)
        .then((b) => {
          if (cancelled) return;

          const a = b['^spx'];
          const c = b['^vix'];
          if (!a || !c) throw new Error('missing batch series');

          setDataMode('live');
          setSpx({ anchorDate, series: a });
          setVix({ anchorDate, series: c });
        })
        .catch(() => {
          // Graceful fallback: keep the UI interactive even if the API/provider is down.
          if (cancelled) return;
          setDataMode('mock');
          setSpx({ anchorDate, series: mockSeries('^spx', anchorDate) });
          setVix({ anchorDate, series: mockSeries('^vix', anchorDate) });
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [anchorDate]);

  const charts = useMemo(() => {
    const width = 260;
    const height = 80;

    const mk = (wrapped: { anchorDate: string; series: SeriesResponse } | null) => {
      const series = wrapped?.anchorDate === anchorDate ? wrapped.series : null;
      const pts = series?.points ?? [];
      return {
        series,
        polyline: toPolyline(pts, width, height),
        last: pts[pts.length - 1]?.close ?? null,
        ready: Boolean(series && pts.length),
      };
    };

    const a = mk(spx);
    const b = mk(vix);

    const reaction = a.series && b.series ? calcReactionSummary(anchorDate, a.series, b.series) : null;

    return {
      spx: a,
      vix: b,
      reaction,
      width,
      height,
    };
  }, [spx, vix, anchorDate]);

  if (!charts.spx.ready || !charts.vix.ready) {
    return (
      <div className="min-h-[200px] space-y-4 sm:min-h-[260px]" aria-busy="true" aria-live="polite">
        <div className="animate-pulse">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="h-3 w-12 rounded bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="mt-2 h-20 w-full rounded-lg bg-slate-200/60 dark:bg-white/5" />
        </div>

        <div className="animate-pulse">
          <div className="flex items-baseline justify-between">
            <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="h-3 w-12 rounded bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="mt-2 h-20 w-full rounded-lg bg-slate-200/60 dark:bg-white/5" />
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400">Loading market window…</div>
      </div>
    );
  }

  const r = charts.reaction;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">7-day window</div>
        <div
          className={
            'rounded-full border px-2 py-0.5 text-[10px] font-medium ' +
            (dataMode === 'live'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200')
          }
          title={dataMode === 'live' ? 'Loaded from API (cached in Postgres)' : 'Fallback mock series (provider/API unavailable)'}
        >
          {dataMode === 'live' ? 'Live' : 'Mock'}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">S&P 500 (SPX)</div>
          <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{charts.spx.last?.toFixed(2)}</div>
        </div>
        <svg
          role="img"
          aria-label={`S&P 500 sparkline for 7 days around ${anchorDate}`}
          viewBox={`0 0 ${charts.width} ${charts.height}`}
          className="mt-2 h-20 w-full"
        >
          <title>{`S&P 500 (SPX) 7-day window around ${anchorDate}`}</title>
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-indigo-600" points={charts.spx.polyline} />
        </svg>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">VIX</div>
          <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{charts.vix.last?.toFixed(2)}</div>
        </div>
        <svg
          role="img"
          aria-label={`VIX sparkline for 7 days around ${anchorDate}`}
          viewBox={`0 0 ${charts.width} ${charts.height}`}
          className="mt-2 h-20 w-full"
        >
          <title>{`VIX 7-day window around ${anchorDate}`}</title>
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-fuchsia-600" points={charts.vix.polyline} />
        </svg>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 text-[11px] text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
        <div className="font-medium text-slate-700 dark:text-slate-200">Quick reaction (MVP)</div>
        <div className="mt-1">
          {r ? (
            <div className="space-y-1">
              <div>
                S&P: {r.spx1dPct == null ? '—' : `${r.spx1dPct >= 0 ? '+' : ''}${r.spx1dPct.toFixed(2)}%`} (prev trading day)
              </div>
              <div>
                S&P: {r.spx7dPct == null ? '—' : `${r.spx7dPct >= 0 ? '+' : ''}${r.spx7dPct.toFixed(2)}%`} (to end of window)
              </div>
              <div>
                VIX: {r.vix7dDelta == null ? '—' : `${r.vix7dDelta >= 0 ? '+' : ''}${r.vix7dDelta.toFixed(2)}`} (to end of window)
              </div>
            </div>
          ) : (
            '—'
          )}
        </div>
        <div className="mt-2 text-slate-500 dark:text-slate-400">Note: based on available daily closes in the 7D window.</div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">
        Free data via FRED/Stooq CSV • Cached in Postgres
        {dataMode === 'mock' ? ' • Showing deterministic fallback data (provider temporarily unavailable)' : ''}
      </div>
    </div>
  );
}
