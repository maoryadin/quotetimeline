import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';
import { fetchFreDDailyCloses } from '@/lib/market/fred';
import {
  addDaysUTC,
  isoDateToUTCDate,
  parseISODateString,
  toISODateString,
} from '@/lib/market/core';

const ALLOWED_SYMBOLS = new Set(['spy.us', '^spx', '^vix', 'vxx.us']);

// Provider/DB cache tuning.
const RECENT_UPDATE_MS = 6 * 60 * 60 * 1000; // 6h
const IMPORT_SLACK_DAYS = 10; // widen import around the requested window for weekends/holidays

function providerForSymbol(symbol: string): { provider: 'stooq' | 'fred'; id: string } {
  // Our UI uses a small set of conventional symbols.
  // Map them to provider-specific identifiers.
  if (symbol === '^spx') return { provider: 'fred', id: 'SP500' };
  if (symbol === '^vix') return { provider: 'fred', id: 'VIXCLS' };

  // Fallback to Stooq symbol passthrough for ETFs.
  return { provider: 'stooq', id: symbol };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const symbol = (url.searchParams.get('symbol') ?? '').toLowerCase();
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 });
  }

  const anchor = parseISODateString(url.searchParams.get('anchor'));
  if (!anchor) {
    return NextResponse.json({ error: 'Invalid anchor date' }, { status: 400 });
  }

  const daysParam = Number(url.searchParams.get('days') ?? '7');
  const days = Number.isFinite(daysParam) ? Math.max(3, Math.min(31, Math.floor(daysParam))) : 7;

  // Interpret "days" as a calendar window centered on the anchor.
  const half = Math.floor(days / 2);
  const start = addDaysUTC(anchor, -half);
  const end = addDaysUTC(anchor, half);

  async function readWindow() {
    const rows = await prisma.marketDaily.findMany({
      where: {
        symbol,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
      select: { date: true, close: true },
    });

    return rows.map((r) => ({ date: toISODateString(r.date), close: r.close }));
  }

  let points = await readWindow();

  function parseISO(s: string): Date | null {
    return parseISODateString(s);
  }

  function hasReasonableCoverage() {
    if (points.length < 2) return false;

    const first = parseISO(points[0]?.date ?? '');
    const last = parseISO(points[points.length - 1]?.date ?? '');
    if (!first || !last) return false;

    // We don't expect to have rows for weekends/holidays, so allow a small slack.
    const startSlack = addDaysUTC(start, 2);
    const endSlack = addDaysUTC(end, -2);

    if (first > startSlack) return false;
    if (last < endSlack) return false;

    const minPoints = Math.min(days, 5);
    if (points.length < minPoints) return false;

    return true;
  }

  // If we have insufficient coverage, refresh cache from the free provider.
  // We widen the import range to handle weekends/holidays around the anchor.
  //
  // Guardrail: only refetch if we haven't updated this symbol recently, to avoid a thundering herd
  // during deploys / traffic spikes.
  if (!hasReasonableCoverage()) {
    const lastUpdate = await prisma.marketDaily.aggregate({
      where: { symbol },
      _max: { updatedAt: true },
    });

    const last = lastUpdate._max.updatedAt;
    const recentlyUpdated = last ? Date.now() - last.getTime() < RECENT_UPDATE_MS : false;

    if (!recentlyUpdated) {
      // Cross-instance guardrail: use a Postgres advisory lock keyed by symbol.
      // This prevents a thundering herd when many users request the same missing window.
      const lockRows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_lock(hashtext(${symbol})) as locked;
      `;
      const locked = lockRows[0]?.locked ?? false;

      if (locked) {
        try {
          const importStart = addDaysUTC(start, -IMPORT_SLACK_DAYS);
          const importEnd = addDaysUTC(end, IMPORT_SLACK_DAYS);

          const mapping = providerForSymbol(symbol);

          const series =
            mapping.provider === 'fred'
              ? await fetchFreDDailyCloses(mapping.id)
              : await fetchStooqDailyCloses(mapping.id);

          const slice = series.filter((p) => {
            const d = parseISODateString(p.date);
            if (!d) return false;
            return d >= importStart && d <= importEnd;
          });

          if (slice.length) {
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
          }

          points = await readWindow();
        } finally {
          await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${symbol}));`;
        }
      } else {
        // Another request (or a cron job) is already refreshing this symbol.
        // Return whatever we currently have; the client can retry shortly.
        points = await readWindow();
      }
    }
  }

  // If still empty (e.g., provider down), return empty series; the client has a graceful fallback.
  return NextResponse.json(
    { symbol, points },
    {
      headers: {
        // Cache the API response briefly at the edge/CDN. DB caching is the real guardrail;
        // this just reduces repeated reads when users scroll rapidly.
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
