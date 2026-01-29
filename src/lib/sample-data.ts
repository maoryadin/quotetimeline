export type QuoteSourceType = 'transcript' | 'video' | 'post' | 'article';

export type Quote = {
  id: string;
  personSlug: string; // e.g. 'donald-trump'
  text: string;
  date: string; // ISO date
  context?: string;
  source: {
    type: QuoteSourceType;
    title: string;
    url: string;
    publisher?: string;
  };
  topics: string[]; // slugs
};

export const SITE = {
  name: 'QuoteTimeline',
  description: 'Verbatim quotes with dates, sources, and context.',
};

export const PEOPLE = [
  {
    slug: 'donald-trump',
    name: 'Donald J. Trump',
    description:
      'A sourced index of verbatim quotes and timelines. Not affiliated with or endorsed by Donald J. Trump or any organization.',
  },
] as const;

export const TOPICS = [
  { slug: 'immigration', name: 'Immigration' },
  { slug: 'election-2024', name: 'Election 2024' },
  { slug: 'nato', name: 'NATO' },
  { slug: 'legal-cases', name: 'Legal cases' },
] as const;

export const QUOTES: Quote[] = [
  {
    id: 'qt-001',
    personSlug: 'donald-trump',
    text: 'We will build the wall.',
    date: '2016-08-31',
    context:
      'Sample record. Replace with a real transcript-backed quote and a reliable source URL before publishing.',
    source: {
      type: 'transcript',
      title: 'Sample transcript source (replace)',
      url: 'https://example.com',
      publisher: 'Example',
    },
    topics: ['immigration', 'election-2024'],
  },
  {
    id: 'qt-002',
    personSlug: 'donald-trump',
    text: 'I will put America first.',
    date: '2017-01-20',
    context:
      'Sample record. Replace with a real transcript-backed quote and a reliable source URL before publishing.',
    source: {
      type: 'transcript',
      title: 'Sample transcript source (replace)',
      url: 'https://example.com',
      publisher: 'Example',
    },
    topics: ['election-2024'],
  },
];

export function slugifyQuote(text: string, date: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${date}`;
}

export function getQuoteBySlug(slug: string) {
  // Our sample slug format ends with -YYYY-MM-DD
  const m = slug.match(/-(\d{4}-\d{2}-\d{2})$/);
  const date = m?.[1];
  if (!date) return null;

  const base = slug.slice(0, -1 * (date.length + 1));
  const found = QUOTES.find((q) => slugifyQuote(q.text, q.date) === `${base}-${q.date}`);
  return found ?? null;
}

export function searchQuotes(q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return QUOTES.filter((x) =>
    [x.text, x.context, x.source.title].filter(Boolean).some((v) => v!.toLowerCase().includes(query))
  );
}
