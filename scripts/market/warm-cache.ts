import { prisma } from '@/lib/db';
import { fetchStooqDailyCloses } from '@/lib/market/stooq';
import { fetchFreDDailyCloses } from '@/lib/market/fred';
import {
  addDaysUTC,
  isoDateToUTCDate,
  parseISODateString,
  toISODateString,
} from '@/lib/market/core';

import { ALLOWED_SYMBOLS, providerForSymbol } from '@/lib/market/symbols';

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, v = 'true'] = a.slice(2).split('=');
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const symbol = String(args.symbol ?? '^spx').toLowerCase();
  if (!ALLOWED_SYMBOLS.has(symbol)) {
    throw new Error(`Unsupported symbol: ${symbol}. Allowed: ${Array.from(ALLOWED_SYMBOLS).join(', ')}`);
  }

  const daysParam = Number(args.days ?? '7');
  const days = Number.isFinite(daysParam) ? Math.max(3, Math.min(31, Math.floor(daysParam))) : 7;
  const half = Math.floor(days / 2);

  const limitParam = Number(args.limit ?? '200');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(2000, Math.floor(limitParam))) : 200;

  const slackParam = Number(args.slack ?? '10');
  const slackDays = Number.isFinite(slackParam) ? Math.max(0, Math.min(60, Math.floor(slackParam))) : 10;

  const quotes = await prisma.quote.findMany({
    select: { date: true },
    orderBy: { date: 'desc' },
    take: limit,
  });

  if (!quotes.length) {
    console.log('[market:warm-cache] No quotes found; nothing to warm.');
    return;
  }

  const anchors = Array.from(
    new Set(quotes.map((q) => toISODateString(q.date))),
  ).sort();

  const firstAnchor = parseISODateString(anchors[0] ?? '');
  const lastAnchor = parseISODateString(anchors[anchors.length - 1] ?? '');
  if (!firstAnchor || !lastAnchor) {
    throw new Error('Failed to compute anchor range from quotes.');
  }

  const start = addDaysUTC(firstAnchor, -half - slackDays);
  const end = addDaysUTC(lastAnchor, half + slackDays);

  const mapping = providerForSymbol(symbol);
  console.log(
    `[market:warm-cache] Warming ${symbol} (${mapping.provider}:${mapping.id}) for ${anchors.length} anchor dates (quotes=${quotes.length}).`,
  );
  console.log(`[market:warm-cache] Import window: ${toISODateString(start)} → ${toISODateString(end)}.`);

  const series =
    mapping.provider === 'fred'
      ? await fetchFreDDailyCloses(mapping.id)
      : await fetchStooqDailyCloses(mapping.id);

  const slice = series.filter((p) => {
    const d = parseISODateString(p.date);
    if (!d) return false;
    return d >= start && d <= end;
  });

  if (!slice.length) {
    console.warn('[market:warm-cache] Provider returned 0 points for requested window.');
    return;
  }

  let upserts = 0;
  await prisma.$transaction(
    slice.map((p) => {
      upserts++;
      return prisma.marketDaily.upsert({
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
      });
    }),
  );

  console.log(`[market:warm-cache] Upserted ${upserts} daily points into MarketDaily.`);
}

main().catch((err) => {
  console.error('[market:warm-cache] Failed:', err);
  process.exitCode = 1;
});
