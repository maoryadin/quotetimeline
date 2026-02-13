import type { MarketPoint } from './core';

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];
  if (lines[0] === 'No data') return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    if (cols.length < header.length) continue;
    const r: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) r[header[i]] = (cols[i] ?? '').trim();
    rows.push(r);
  }

  return rows;
}

export async function fetchStooqDailyCloses(symbol: string): Promise<MarketPoint[]> {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const res = await fetch(url, {
    // Stooq is a free endpoint; we will cache in DB ourselves.
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`stooq fetch failed (${res.status})`);
  }

  const text = await res.text();
  const rows = parseCsv(text);

  const points: MarketPoint[] = [];
  for (const r of rows) {
    const date = r['Date'];
    const close = Number(r['Close']);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close)) continue;
    points.push({ date: date as MarketPoint['date'], close });
  }

  return points;
}
