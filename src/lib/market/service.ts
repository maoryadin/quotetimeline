import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';
import { fetchFreDDailyCloses } from '@/lib/market/fred';
import { addDaysUTC, isoDateToUTCDate, parseISODateString, toISODateString } from '@/lib/market/core';
import { ALLOWED_SYMBOLS, providerForSymbol } from '@/lib/market/symbols';

export type MarketPoint = { date: string; close: number };
export type MarketSeries = { symbol: string; points: MarketPoint[] };

// Provider/DB cache tuning.
const RECENT_UPDATE_MS = 6 * 60 * 60 * 1000; // 6h
const IMPORT_SLACK_DAYS = 10; // widen import around the requested window for weekends/holidays

export async function getMarketWindowSeries(symbolRaw: string, anchorRaw: string, daysRaw: number): Promise<MarketSeries> {
  const symbol = (symbolRaw ?? '').toLowerCase();
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    throw new Error('Unsupported symbol');
  }

  const anchor = parseISODateString(anchorRaw);
  if (!anchor) {
    throw new Error('Invalid anchor date');
  }

  const days = Number.isFinite(daysRaw) ? Math.max(3, Math.min(31, Math.floor(daysRaw))) : 7;

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

  function hasReasonableCoverage() {
    if (points.length < 2) return false;

    const first = parseISODateString(points[0]?.date ?? '');
    const last = parseISODateString(points[points.length - 1]?.date ?? '');
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

  if (!hasReasonableCoverage()) {
    const lastUpdate = await prisma.marketDaily.aggregate({
      where: { symbol },
      _max: { updatedAt: true },
    });

    const last = lastUpdate._max.updatedAt;
    const recentlyUpdated = last ? Date.now() - last.getTime() < RECENT_UPDATE_MS : false;

    if (!recentlyUpdated) {
      // Cross-instance guardrail: use a Postgres advisory lock keyed by symbol.
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
        points = await readWindow();
      }
    }
  }

  return { symbol, points };
}
