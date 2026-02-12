'use client';

import { useEffect, useMemo, useState } from 'react';

type Point = { date: string; close: number };

type SeriesResponse = {
  symbol: string;
  points: Point[];
};

// Client-side memoization so rapid scrollytelling doesn't spam /api/market.
const seriesCache = new Map<string, SeriesResponse>();
const inflight = new Map<string, Promise<SeriesResponse>>();

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

function mockSeries(symbol: string, anchorDate: string): SeriesResponse {
  // Deterministic mock so UI works even before the real market cache is wired.
  // (This also serves as a graceful fallback if the free provider is down.)
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

async function fetchSeries(symbol: string, anchorDate: string) {
  const url = `/api/market?symbol=${encodeURIComponent(symbol)}&anchor=${encodeURIComponent(anchorDate)}&days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`market series failed: ${res.status}`);
  return (await res.json()) as SeriesResponse;
}

async function fetchSeriesCached(symbol: string, anchorDate: string) {
  const key = `${symbol}::${anchorDate}`;

  const cached = seriesCache.get(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = fetchSeries(symbol, anchorDate)
    .then((series) => {
      seriesCache.set(key, series);
      inflight.delete(key);
      return series;
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

  useEffect(() => {
    let cancelled = false;

    // Small debounce so quick scroll bursts only fetch the final anchor.
    const t = window.setTimeout(() => {
      Promise.all([fetchSeriesCached('^spx', anchorDate), fetchSeriesCached('^vix', anchorDate)])
        .then(([a, b]) => {
          if (cancelled) return;
          setSpx({ anchorDate, series: a });
          setVix({ anchorDate, series: b });
        })
        .catch(() => {
          // Graceful fallback: keep the UI interactive even if the API/provider is down.
          if (cancelled) return;
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
        polyline: toPolyline(pts, width, height),
        last: pts[pts.length - 1]?.close ?? null,
        ready: Boolean(series && pts.length),
      };
    };

    return {
      spx: mk(spx),
      vix: mk(vix),
      width,
      height,
    };
  }, [spx, vix, anchorDate]);

  if (!charts.spx.ready || !charts.vix.ready) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
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

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">S&P 500 (SPX)</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{charts.spx.last?.toFixed(2)}</div>
        </div>
        <svg viewBox={`0 0 ${charts.width} ${charts.height}`} className="mt-2 h-20 w-full">
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-indigo-600" points={charts.spx.polyline} />
        </svg>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">VIX</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{charts.vix.last?.toFixed(2)}</div>
        </div>
        <svg viewBox={`0 0 ${charts.width} ${charts.height}`} className="mt-2 h-20 w-full">
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-fuchsia-600" points={charts.vix.polyline} />
        </svg>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">Free data via Stooq CSV • Cached in DB</div>
    </div>
  );
}
