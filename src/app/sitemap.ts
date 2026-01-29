export const dynamic = 'force-dynamic';

import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const [people, topics, quotes] = await Promise.all([
    prisma.person.findMany({ select: { slug: true } }),
    prisma.topic.findMany({ select: { slug: true } }),
    prisma.quote.findMany({ select: { slug: true, date: true } }),
  ]);

  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/trending`, lastModified: new Date() },
    { url: `${base}/search`, lastModified: new Date() },
  ];

  for (const p of people) urls.push({ url: `${base}/person/${p.slug}`, lastModified: new Date() });
  for (const t of topics) urls.push({ url: `${base}/topic/${t.slug}`, lastModified: new Date() });
  for (const q of quotes) urls.push({ url: `${base}/quote/${q.slug}`, lastModified: q.date });

  return urls;
}
