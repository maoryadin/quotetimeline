export const dynamic = 'force-dynamic';

import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Google/Bing sitemap limits are 50k URLs per sitemap.
  // Keep a safety margin and only include the most-recent quotes if we ever exceed it.
  // (When the dataset grows, we should implement a sitemap index + multiple quote sitemaps.)
  const QUOTE_URL_LIMIT = 45_000;

  const [topics, quotesCount, topicLastModified] = await Promise.all([
    prisma.topic.findMany({ select: { id: true, slug: true } }),
    prisma.quote.count(),
    prisma.$queryRaw<Array<{ topicId: string; last: Date | null }>>`
      SELECT qt."topicId", MAX(q."date") AS "last"
      FROM "QuoteTopic" qt
      JOIN "Quote" q ON q.id = qt."quoteId"
      GROUP BY qt."topicId";
    `,
  ]);

  const topicLast = new Map(topicLastModified.map((r) => [r.topicId, r.last ?? null]));

  const quotes = await prisma.quote.findMany({
    select: { slug: true, date: true },
    orderBy: { date: 'desc' },
    take: Math.min(quotesCount, QUOTE_URL_LIMIT),
  });

  if (quotesCount > QUOTE_URL_LIMIT) {
    console.warn(
      `[sitemap] Quote count (${quotesCount}) exceeds limit (${QUOTE_URL_LIMIT}). Only including the most recent ${QUOTE_URL_LIMIT} quote URLs.`
    );
  }

  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/story`, lastModified: now },
    { url: `${base}/topics`, lastModified: now },
    { url: `${base}/trending`, lastModified: now },
    { url: `${base}/search`, lastModified: now },
  ];

  for (const t of topics) {
    urls.push({ url: `${base}/topic/${t.slug}`, lastModified: topicLast.get(t.id) ?? now });
  }

  for (const q of quotes) urls.push({ url: `${base}/quote/${q.slug}`, lastModified: q.date });

  return urls;
}
