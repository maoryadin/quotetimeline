import type { MetadataRoute } from 'next';
import { PEOPLE, TOPICS, QUOTES, slugifyQuote } from '@/lib/sample-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/trending`, lastModified: new Date() },
  ];

  for (const p of PEOPLE) urls.push({ url: `${base}/person/${p.slug}`, lastModified: new Date() });
  for (const t of TOPICS) urls.push({ url: `${base}/topic/${t.slug}`, lastModified: new Date() });
  for (const q of QUOTES) {
    urls.push({ url: `${base}/quote/${slugifyQuote(q.text, q.date)}`, lastModified: new Date(q.date) });
  }

  return urls;
}
