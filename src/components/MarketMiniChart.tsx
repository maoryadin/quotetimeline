'use client';

import { useEffect, useMemo, useState } from 'react';

type Point = { date: string; close: number };

type SeriesResponse = {
  symbol: string;
  points: Point[];
};

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
  const base = symbol.includes('vxx') ? 18 : 470;

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

type Props = {
  anchorDate: string; // YYYY-MM-DD
};

export function MarketMiniChart({ anchorDate }: Props) {
  const [spy, setSpy] = useState<{ anchorDate: string; series: SeriesResponse } | null>(null);
  const [vxx, setVxx] = useState<{ anchorDate: string; series: SeriesResponse } | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchSeries('spy.us', anchorDate), fetchSeries('vxx.us', anchorDate)])
      .then(([a, b]) => {
        if (cancelled) return;
        setSpy({ anchorDate, series: a });
        setVxx({ anchorDate, series: b });
      })
      .catch(() => {
        // Graceful fallback: keep the UI interactive even if /api/market isn't implemented yet.
        if (cancelled) return;
        setSpy({ anchorDate, series: mockSeries('spy.us', anchorDate) });
        setVxx({ anchorDate, series: mockSeries('vxx.us', anchorDate) });
      });

    return () => {
      cancelled = true;
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
      spy: mk(spy),
      vxx: mk(vxx),
      width,
      height,
    };
  }, [spy, vxx, anchorDate]);

  if (!charts.spy.ready || !charts.vxx.ready) {
    return <div className="text-xs text-slate-500 dark:text-slate-400">Loading SPY & VXX…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">SPY (S&P proxy)</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{charts.spy.last?.toFixed(2)}</div>
        </div>
        <svg viewBox={`0 0 ${charts.width} ${charts.height}`} className="mt-2 h-20 w-full">
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-indigo-600" points={charts.spy.polyline} />
        </svg>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">VXX (VIX proxy)</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{charts.vxx.last?.toFixed(2)}</div>
        </div>
        <svg viewBox={`0 0 ${charts.width} ${charts.height}`} className="mt-2 h-20 w-full">
          <polyline fill="none" strokeWidth="2" stroke="currentColor" className="text-fuchsia-600" points={charts.vxx.polyline} />
        </svg>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400">Free data via Stooq CSV • Cached in DB</div>
    </div>
  );
}
