import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchFreDDailyCloses } from '@/lib/market/fred';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';
import { addDaysUTC, isoDateToUTCDate, parseISODateString, toISODateString } from '@/lib/market/core';

const SYMBOLS = ['^spx', '^vix'] as const;
const ALLOWED = new Set<string>(SYMBOLS);

function providerForSymbol(symbol: string): { provider: 'fred' | 'stooq'; id: string } {
  if (symbol === '^spx') return { provider: 'fred', id: 'SP500' };
  if (symbol === '^vix') return { provider: 'fred', id: 'VIXCLS' };
  return { provider: 'stooq', id: symbol };
}

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('secret');
  const fromHeader = req.headers.get('x-cron-secret');
  const auth = req.headers.get('authorization') ?? '';
  const fromBearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;

  return fromQuery === secret || fromHeader === secret || fromBearer === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const symbolParam = (url.searchParams.get('symbol') ?? '').toLowerCase();
  const symbols = symbolParam ? [symbolParam] : [...SYMBOLS];

  for (const s of symbols) {
    if (!ALLOWED.has(s)) {
      return NextResponse.json({ error: `Unsupported symbol: ${s}` }, { status: 400 });
    }
  }

  const limitParam = Number(url.searchParams.get('limit') ?? '500');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(2000, Math.floor(limitParam))) : 500;

  const daysParam = Number(url.searchParams.get('days') ?? '7');
  const days = Number.isFinite(daysParam) ? Math.max(3, Math.min(31, Math.floor(daysParam))) : 7;
  const half = Math.floor(days / 2);

  const slackParam = Number(url.searchParams.get('slack') ?? '10');
  const slackDays = Number.isFinite(slackParam) ? Math.max(0, Math.min(60, Math.floor(slackParam))) : 10;

  const quotes = await prisma.quote.findMany({
    select: { date: true },
    orderBy: { date: 'desc' },
    take: limit,
  });

  if (!quotes.length) {
    return NextResponse.json({ ok: true, warmed: [], note: 'No quotes found; nothing to warm.' });
  }

  const anchors = Array.from(new Set(quotes.map((q) => toISODateString(q.date)))).sort();

  const first = parseISODateString(anchors[0] ?? '');
  const last = parseISODateString(anchors[anchors.length - 1] ?? '');
  if (!first || !last) {
    return NextResponse.json({ error: 'Failed to compute anchor range.' }, { status: 500 });
  }

  const start = addDaysUTC(first, -half - slackDays);
  const end = addDaysUTC(last, half + slackDays);

  const results: Array<{ symbol: string; provider: string; pointsUpserted: number }> = [];

  for (const symbol of symbols) {
    // Prevent overlapping warm runs across concurrent cron invocations.
    const lockRows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(hashtext(${symbol})) as locked;
    `;
    const locked = lockRows[0]?.locked ?? false;

    if (!locked) {
      results.push({ symbol, provider: 'locked', pointsUpserted: 0 });
      continue;
    }

    try {
      const mapping = providerForSymbol(symbol);
      const series =
        mapping.provider === 'fred' ? await fetchFreDDailyCloses(mapping.id) : await fetchStooqDailyCloses(mapping.id);

      const slice = series.filter((p) => {
        const d = parseISODateString(p.date);
        if (!d) return false;
        return d >= start && d <= end;
      });

      if (!slice.length) {
        results.push({ symbol, provider: mapping.provider, pointsUpserted: 0 });
        continue;
      }

      await prisma.$transaction(
        slice.map((p) =>
          prisma.marketDaily.upsert({
            where: {
              symbol_date: {
                symbol,
                date: isoDateToUTCDate(p.date),
              },
            },
            create: {
              symbol,
              date: isoDateToUTCDate(p.date),
              close: p.close,
              provider: mapping.provider,
            },
            update: {
              close: p.close,
              provider: mapping.provider,
            },
          }),
        ),
      );

      results.push({ symbol, provider: mapping.provider, pointsUpserted: slice.length });
    } finally {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${symbol}));`;
    }
  }

  return NextResponse.json({
    ok: true,
    anchors: anchors.length,
    window: { start: toISODateString(start), end: toISODateString(end) },
    warmed: results,
  });
}
