import { NextResponse } from 'next/server';
import { getMarketWindowSeries } from '@/lib/market/service';
import { ALLOWED_SYMBOLS } from '@/lib/market/symbols';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const anchor = url.searchParams.get('anchor') ?? '';

  const daysParam = Number(url.searchParams.get('days') ?? '7');
  const days = Number.isFinite(daysParam) ? Math.max(3, Math.min(31, Math.floor(daysParam))) : 7;

  const symbolsParam = (url.searchParams.get('symbols') ?? '').trim();
  const symbols = (symbolsParam ? symbolsParam.split(',') : ['^spx', '^vix'])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!symbols.length) {
    return NextResponse.json({ error: 'Missing symbols' }, { status: 400 });
  }

  for (const s of symbols) {
    if (!ALLOWED_SYMBOLS.has(s)) {
      return NextResponse.json({ error: `Unsupported symbol: ${s}` }, { status: 400 });
    }
  }

  try {
    const rows = await Promise.all(symbols.map((s) => getMarketWindowSeries(s, anchor, days)));

    const series: Record<string, { symbol: string; points: Array<{ date: string; close: number }> }> = {};
    for (const r of rows) series[r.symbol] = r;

    return NextResponse.json(
      { anchor, days, series },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes('anchor')) {
      return NextResponse.json({ error: 'Invalid anchor date' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to load market series' }, { status: 500 });
  }
}
