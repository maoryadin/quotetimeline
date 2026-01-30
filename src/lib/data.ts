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
  description: 'Trump quotes with dates, sources, and context.',
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

export const getTopTopicsByPerson = cache(async (personSlug: string, limit = 12) => {
  const grouped = await prisma.quoteTopic.groupBy({
    by: ['topicId'],
    where: { quote: { person: { slug: personSlug } } },
    _count: { topicId: true },
    orderBy: { _count: { topicId: 'desc' } },
    take: limit,
  });

  const topicIds = grouped.map((g) => g.topicId);
  if (!topicIds.length) return [] as Array<{ slug: string; name: string; n: number }>;

  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(topics.map((t) => [t.id, t] as const));

  return grouped
    .map((g) => {
      const t = byId.get(g.topicId);
      if (!t) return null;
      return { slug: t.slug, name: t.name, n: g._count.topicId };
    })
    .filter((x): x is { slug: string; name: string; n: number } => Boolean(x));
});

export const getTopicsWithCounts = cache(async () => {
  return prisma.topic.findMany({
    select: {
      slug: true,
      name: true,
      _count: { select: { quotes: true } },
    },
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

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function clampPageSize(n: number) {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

function clampPage(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

export type Pagination = {
  page?: number;
  pageSize?: number;
};

export const getQuoteCountByPerson = cache(async (personSlug: string) => {
  return prisma.quote.count({ where: { person: { slug: personSlug } } });
});

export const getQuoteCountByTopic = cache(async (topicSlug: string) => {
  return prisma.quote.count({ where: { topics: { some: { topic: { slug: topicSlug } } } } });
});

export const getQuotesByPerson = cache(async (personSlug: string, pagination: Pagination = {}) => {
  const pageSize = clampPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = clampPage(pagination.page ?? 1);

  const quotes = await prisma.quote.findMany({
    where: { person: { slug: personSlug } },
    orderBy: { date: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
    include: {
      person: { select: { slug: true } },
      source: { select: { type: true, title: true, url: true, publisher: true } },
      topics: { include: { topic: { select: { slug: true } } } },
    },
  });
  return quotes.map(mapQuote);
});

export const getQuotesByTopic = cache(async (topicSlug: string, pagination: Pagination = {}) => {
  const pageSize = clampPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = clampPage(pagination.page ?? 1);

  const quotes = await prisma.quote.findMany({
    where: { topics: { some: { topic: { slug: topicSlug } } } },
    orderBy: { date: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
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

  // Tokenize to make multi-word searches useful.
  // Example: "border wall" should match even if the words are separated.
  // We AND terms together, but each term can match in any supported field.
  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);

  const where = terms.length
    ? {
        AND: terms.map((term) => ({
          OR: [
            { text: { contains: term, mode: 'insensitive' as const } },
            { context: { contains: term, mode: 'insensitive' as const } },
            { source: { title: { contains: term, mode: 'insensitive' as const } } },
            { person: { name: { contains: term, mode: 'insensitive' as const } } },
          ],
        })),
      }
    : {
        OR: [
          { text: { contains: q, mode: 'insensitive' as const } },
          { context: { contains: q, mode: 'insensitive' as const } },
          { source: { title: { contains: q, mode: 'insensitive' as const } } },
          { person: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      };

  const quotes = await prisma.quote.findMany({
    where,
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
