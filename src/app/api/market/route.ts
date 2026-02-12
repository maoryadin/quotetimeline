import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';

function parseISODate(s: string | null): Date | null {
  if (!s) return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

const ALLOWED_SYMBOLS = new Set(['spy.us', 'vxx.us']);

export async function GET(req: Request) {
  const url = new URL(req.url);

  const symbol = (url.searchParams.get('symbol') ?? '').toLowerCase();
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 });
  }

  const anchor = parseISODate(url.searchParams.get('anchor'));
  if (!anchor) {
    return NextResponse.json({ error: 'Invalid anchor date' }, { status: 400 });
  }

  const daysParam = Number(url.searchParams.get('days') ?? '7');
  const days = Number.isFinite(daysParam) ? Math.max(3, Math.min(31, Math.floor(daysParam))) : 7;

  // Interpret "days" as a calendar window centered on the anchor.
  const half = Math.floor(days / 2);
  const start = addDays(anchor, -half);
  const end = addDays(anchor, half);

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

    return rows.map((r) => ({ date: toISO(r.date), close: r.close }));
  }

  let points = await readWindow();

  // If we have fewer than 2 points (or nothing), refresh cache from the free provider.
  // We also widen the import range a bit to handle weekends/holidays around the anchor.
  //
  // Guardrail: only refetch if we haven't updated this symbol recently, to avoid a thundering herd
  // during deploys / traffic spikes.
  if (points.length < 2) {
    const lastUpdate = await prisma.marketDaily.aggregate({
      where: { symbol },
      _max: { updatedAt: true },
    });

    const last = lastUpdate._max.updatedAt;
    const recentlyUpdated = last ? Date.now() - last.getTime() < 6 * 60 * 60 * 1000 : false;

    if (!recentlyUpdated) {
      const importStart = addDays(start, -10);
      const importEnd = addDays(end, 10);

      const series = await fetchStooqDailyCloses(symbol);
      const slice = series.filter((p) => {
        const d = parseISODate(p.date);
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
                  date: new Date(`${p.date}T00:00:00Z`),
                },
              },
              create: {
                symbol,
                date: new Date(`${p.date}T00:00:00Z`),
                close: p.close,
                provider: 'stooq',
              },
              update: {
                close: p.close,
                provider: 'stooq',
              },
            }),
          ),
        );
      }

      points = await readWindow();
    }
  }

  // If still empty (e.g., provider down), return empty series; the client has a graceful fallback.
  return NextResponse.json({ symbol, points });
}
