import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { SourceType } from '@prisma/client';

export type QuoteSource = {
  type: SourceType;
  title: string;
  url: string;
  publisher?: string | null;
};

export type QuoteView = {
  id: string;
  slug: string;
  personSlug: string;
  text: string;
  date: string; // YYYY-MM-DD
  context?: string | null;
  source: QuoteSource;
  topics: string[];
};

export const SITE = {
  name: 'QuoteTimeline',
  description: 'Verbatim quotes with dates, sources, and context.',
};

export const slugifyQuote = (text: string, date: string) => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${date}`;
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function mapQuote(q: {
  id: string;
  slug: string;
  text: string;
  date: Date;
  context: string | null;
  person: { slug: string };
  source: { type: SourceType; title: string; url: string; publisher: string | null };
  topics: Array<{ topic: { slug: string } }>;
}): QuoteView {
  return {
    id: q.id,
    slug: q.slug,
    personSlug: q.person.slug,
    text: q.text,
    date: toISODate(q.date),
    context: q.context,
    source: {
      type: q.source.type,
      title: q.source.title,
      url: q.source.url,
      publisher: q.source.publisher,
    },
    topics: q.topics.map((t) => t.topic.slug),
  };
}

export const getPeople = cache(async () => {
  return prisma.person.findMany({
    select: { slug: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });
});

export const getPersonBySlug = cache(async (slug: string) => {
  return prisma.person.findUnique({ where: { slug } });
});

export const getTopics = cache(async () => {
  return prisma.topic.findMany({
    select: { slug: true, name: true },
    orderBy: { name: 'asc' },
  });
});

export const getTopicBySlug = cache(async (slug: string) => {
  return prisma.topic.findUnique({ where: { slug } });
});

export const getLatestQuotes = cache(async (limit: number) => {
  const quotes = await prisma.quote.findMany({
    take: limit,
    orderBy: { date: 'desc' },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });
  return quotes.map(mapQuote);
});

export const getQuotesByPerson = cache(async (personSlug: string) => {
  const quotes = await prisma.quote.findMany({
    where: { person: { slug: personSlug } },
    orderBy: { date: 'desc' },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });
  return quotes.map(mapQuote);
});

export const getQuotesByTopic = cache(async (topicSlug: string) => {
  const quotes = await prisma.quote.findMany({
    where: { topics: { some: { topic: { slug: topicSlug } } } },
    orderBy: { date: 'desc' },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });
  return quotes.map(mapQuote);
});

export const getQuoteBySlug = cache(async (slug: string) => {
  const q = await prisma.quote.findUnique({
    where: { slug },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });
  return q ? mapQuote(q) : null;
});

export const getRelatedQuotes = cache(async (quoteSlug: string, limit: number) => {
  const q = await prisma.quote.findUnique({
    where: { slug: quoteSlug },
    select: { id: true, personId: true, topics: { select: { topicId: true } } },
  });
  if (!q) return [];

  const topicIds = q.topics.map((t) => t.topicId);

  const related = await prisma.quote.findMany({
    where: {
      id: { not: q.id },
      OR: [
        { personId: q.personId },
        ...(topicIds.length ? [{ topics: { some: { topicId: { in: topicIds } } } }] : []),
      ],
    },
    take: limit,
    orderBy: { date: 'desc' },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });

  return related.map(mapQuote);
});

export const searchQuotes = cache(async (query: string) => {
  const q = query.trim();
  if (!q) return [];

  const quotes = await prisma.quote.findMany({
    where: {
      OR: [
        { text: { contains: q, mode: 'insensitive' } },
        { context: { contains: q, mode: 'insensitive' } },
        { source: { title: { contains: q, mode: 'insensitive' } } },
        { person: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    take: 100,
    orderBy: { date: 'desc' },
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });

  return quotes.map(mapQuote);
});

export const getTrendingTopics = cache(async () => {
  const grouped = await prisma.quoteTopic.groupBy({
    by: ['topicId'],
    _count: { topicId: true },
    orderBy: { _count: { topicId: 'desc' } },
  });

  const topicIds = grouped.map((g) => g.topicId);
  const topics = await prisma.topic.findMany({ where: { id: { in: topicIds } }, select: { id: true, slug: true, name: true } });
  const byId = new Map(topics.map((t) => [t.id, t] as const));

  return grouped
    .map((g) => {
      const t = byId.get(g.topicId);
      return {
        slug: t?.slug ?? g.topicId,
        name: t?.name ?? g.topicId,
        n: g._count.topicId,
      };
    })
    .filter((x) => x.slug);
});
