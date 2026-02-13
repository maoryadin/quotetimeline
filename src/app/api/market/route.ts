import { NextResponse } from 'next/server';
import { getMarketWindowSeries } from '@/lib/market/service';
import { ALLOWED_SYMBOLS } from '@/lib/market/symbols';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const symbol = (url.searchParams.get('symbol') ?? '').toLowerCase();
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 });
  }

  const anchor = url.searchParams.get('anchor') ?? '';
  const daysParam = Number(url.searchParams.get('days') ?? '7');

  try {
    const series = await getMarketWindowSeries(symbol, anchor, daysParam);

    return NextResponse.json(series, {
      headers: {
        // Cache the API response briefly at the edge/CDN. DB caching is the real guardrail;
        // this just reduces repeated reads when users scroll rapidly.
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes('anchor')) {
      return NextResponse.json({ error: 'Invalid anchor date' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to load market series' }, { status: 500 });
  }
}
