export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

const ALLOWED_SYMBOLS = new Set(['spy.us', 'vxx.us']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get('symbol') ?? '').toLowerCase();
  const anchor = url.searchParams.get('anchor') ?? '';
  const days = Number(url.searchParams.get('days') ?? '7');

  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: 'unsupported_symbol' }, { status: 400 });
  }

  if (!isISODate(anchor)) {
    return NextResponse.json({ error: 'bad_anchor' }, { status: 400 });
  }

  // MVP: fixed 7D window around the quote day (3 days before → 3 days after).
  const radius = days === 7 ? 3 : Math.max(1, Math.floor((days - 1) / 2));
  const start = addDays(anchor, -radius);
  const end = addDays(anchor, radius);

  const existing = await prisma.marketDaily.findMany({
    where: {
      symbol,
      date: { gte: toDate(start), lte: toDate(end) },
    },
    select: { date: true, close: true },
    orderBy: { date: 'asc' },
  });

  // If we have at least some data, return it immediately.
  // We'll still fill gaps below when missing.
  const byDate = new Map(existing.map((p) => [p.date.toISOString().slice(0, 10), p.close] as const));

  const expectedDates: string[] = [];
  for (let i = -radius; i <= radius; i++) expectedDates.push(addDays(anchor, i));
  const missingDates = expectedDates.filter((d) => !byDate.has(d));

  if (missingDates.length) {
    const all = await fetchStooqDailyCloses(symbol);
    const inRange = all.filter((p) => p.date >= start && p.date <= end);

    // Upsert any missing days we got from the provider.
    // (Not every day will exist due to weekends/holidays; that's fine.)
    await prisma.$transaction(
      inRange.map((p) =>
        prisma.marketDaily.upsert({
          where: { symbol_date: { symbol, date: toDate(p.date) } },
          create: { symbol, date: toDate(p.date), close: p.close, provider: 'stooq' },
          update: { close: p.close, provider: 'stooq' },
        }),
      ),
    );

    const after = await prisma.marketDaily.findMany({
      where: {
        symbol,
        date: { gte: toDate(start), lte: toDate(end) },
      },
      select: { date: true, close: true },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      symbol,
      start,
      end,
      points: after.map((p) => ({ date: p.date.toISOString().slice(0, 10), close: p.close })),
    });
  }

  return NextResponse.json({
    symbol,
    start,
    end,
    points: existing.map((p) => ({ date: p.date.toISOString().slice(0, 10), close: p.close })),
  });
}
