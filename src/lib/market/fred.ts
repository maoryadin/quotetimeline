import type { MarketPoint } from './core';

function parseFredCsv(text: string): MarketPoint[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  // Expected header: DATE,VALUE
  const header = lines[0]?.split(',').map((h) => h.trim().toUpperCase()) ?? [];
  const dateIdx = header.indexOf('DATE');
  const valueIdx = header.indexOf('VALUE');
  if (dateIdx === -1 || valueIdx === -1) return [];

  const points: MarketPoint[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim());
    const date = cols[dateIdx];
    const raw = cols[valueIdx];
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !raw || raw === '.') continue;

    const close = Number(raw);
    if (!Number.isFinite(close)) continue;
    points.push({ date: date as MarketPoint['date'], close });
  }

  return points;
}

export async function fetchFreDDailyCloses(seriesId: string): Promise<MarketPoint[]> {
  // FRED offers a simple CSV export without an API key.
  // Example: https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;

  const res = await fetch(url, {
    // We'll cache in Postgres; this request should always be a real fetch when called.
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`fred fetch failed (${res.status})`);
  }

  const text = await res.text();
  return parseFredCsv(text);
}
