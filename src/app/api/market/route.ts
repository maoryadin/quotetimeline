export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function startOfDayUtc(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDaysUtc(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function clampInt(v: string | null, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

type Point = { date: string; close: number };

async function ensureMarketWindow(symbol: string, fromISO: string, toISO: string): Promise<Point[]> {
  const from = startOfDayUtc(fromISO);
  const to = startOfDayUtc(toISO);

  const existing = await prisma.marketDaily.findMany({
    where: {
      symbol,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: 'asc' },
    select: { date: true, close: true },
  });

  const have = new Set(existing.map((p) => toISODate(p.date)));

  // Backfill only if we're missing points in the requested window.
  // (Market days may be fewer than `days` due to weekends/holidays.)
  if (!have.size) {
    const fetched = await fetchStooqDailyCloses(symbol);
    const inRange = fetched.filter((p) => p.date >= fromISO && p.date <= toISO);

    if (inRange.length) {
      await prisma.$transaction(
        inRange.map((p) =>
          prisma.marketDaily.upsert({
            where: { symbol_date: { symbol, date: startOfDayUtc(p.date) } },
            create: { symbol, date: startOfDayUtc(p.date), close: p.close, provider: 'stooq' },
            update: { close: p.close, provider: 'stooq' },
          }),
        ),
      );
    }
  }

  const final = await prisma.marketDaily.findMany({
    where: {
      symbol,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: 'asc' },
    select: { date: true, close: true },
  });

  return final.map((p) => ({ date: toISODate(p.date), close: p.close }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawSymbol = (searchParams.get('symbol') ?? '').trim().toLowerCase();
  const anchor = (searchParams.get('anchor') ?? '').trim();
  const days = clampInt(searchParams.get('days'), 1, 31, 7);

  if (!rawSymbol) {
    return NextResponse.json({ error: 'missing symbol' }, { status: 400 });
  }

  // Keep a conservative allow-list for the MVP to avoid being a proxy.
  const allowed = new Set(['spy.us', 'vxx.us']);
  if (!allowed.has(rawSymbol)) {
    return NextResponse.json({ error: 'unsupported symbol (MVP)' }, { status: 400 });
  }

  if (!anchor || !isISODate(anchor)) {
    return NextResponse.json({ error: 'missing/invalid anchor (YYYY-MM-DD)' }, { status: 400 });
  }

  // Build a symmetric-ish window around the anchor date.
  // Example: days=7 -> [-3, +3]
  const half = Math.floor(days / 2);
  const anchorDate = startOfDayUtc(anchor);
  const fromISO = toISODate(addDaysUtc(anchorDate, -half));
  const toISO = toISODate(addDaysUtc(anchorDate, half));

  try {
    const points = await ensureMarketWindow(rawSymbol, fromISO, toISO);
    return NextResponse.json({ symbol: rawSymbol, points });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
