import { PrismaClient, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

// Legally-safe / reliable v1 dataset:
// - Public domain U.S. presidential inaugural addresses (1789–2005)
// - Distributed by Project Gutenberg (https://www.gutenberg.org/ebooks/925)
// - We store the source URL and import short, sentence-level excerpts.
// NOTE: This seed intentionally stays small (50–200 entries).

type SeedSpeech = {
  person: { slug: string; name: string; description?: string };
  dateISO: string; // YYYY-MM-DD
  sectionStart: string; // exact heading line in the Gutenberg text
  source: { type: SourceType; title: string; url: string; publisher?: string };
  topics: Array<{ slug: string; name: string }>;
  maxQuotes: number;
};

const GUTENBERG_TXT_URL = 'https://www.gutenberg.org/cache/epub/925/pg925.txt';

const SPEECHES: SeedSpeech[] = [
  {
    person: {
      slug: 'george-washington',
      name: 'George Washington',
      description: 'Sourced index of verbatim quotes from public domain transcripts.',
    },
    dateISO: '1789-04-30',
    sectionStart: 'GEORGE WASHINGTON, FIRST INAUGURAL ADDRESS',
    source: {
      type: 'transcript',
      title: "United States Presidents' Inaugural Speeches (Project Gutenberg #925)",
      url: GUTENBERG_TXT_URL,
      publisher: 'Project Gutenberg',
    },
    topics: [
      { slug: 'governance', name: 'Governance' },
      { slug: 'unity', name: 'Unity' },
    ],
    maxQuotes: 30,
  },
  {
    person: {
      slug: 'abraham-lincoln',
      name: 'Abraham Lincoln',
      description: 'Sourced index of verbatim quotes from public domain transcripts.',
    },
    dateISO: '1865-03-04',
    sectionStart: 'ABRAHAM LINCOLN, SECOND INAUGURAL ADDRESS',
    source: {
      type: 'transcript',
      title: "United States Presidents' Inaugural Speeches (Project Gutenberg #925)",
      url: GUTENBERG_TXT_URL,
      publisher: 'Project Gutenberg',
    },
    topics: [
      { slug: 'civil-war', name: 'Civil War' },
      { slug: 'unity', name: 'Unity' },
    ],
    maxQuotes: 30,
  },
  {
    person: {
      slug: 'franklin-d-roosevelt',
      name: 'Franklin D. Roosevelt',
      description: 'Sourced index of verbatim quotes from public domain transcripts.',
    },
    dateISO: '1933-03-04',
    sectionStart: 'FRANKLIN D. ROOSEVELT, FIRST INAUGURAL ADDRESS',
    source: {
      type: 'transcript',
      title: "United States Presidents' Inaugural Speeches (Project Gutenberg #925)",
      url: GUTENBERG_TXT_URL,
      publisher: 'Project Gutenberg',
    },
    topics: [
      { slug: 'economy', name: 'Economy' },
      { slug: 'governance', name: 'Governance' },
    ],
    maxQuotes: 30,
  },
  {
    person: {
      slug: 'john-f-kennedy',
      name: 'John F. Kennedy',
      description: 'Sourced index of verbatim quotes from public domain transcripts.',
    },
    dateISO: '1961-01-20',
    sectionStart: 'JOHN F. KENNEDY, INAUGURAL ADDRESS',
    source: {
      type: 'transcript',
      title: "United States Presidents' Inaugural Speeches (Project Gutenberg #925)",
      url: GUTENBERG_TXT_URL,
      publisher: 'Project Gutenberg',
    },
    topics: [
      { slug: 'foreign-policy', name: 'Foreign policy' },
      { slug: 'freedom', name: 'Freedom' },
    ],
    maxQuotes: 30,
  },
  {
    person: {
      slug: 'ronald-reagan',
      name: 'Ronald Reagan',
      description: 'Sourced index of verbatim quotes from public domain transcripts.',
    },
    dateISO: '1981-01-20',
    sectionStart: 'RONALD REAGAN, FIRST INAUGURAL ADDRESS',
    source: {
      type: 'transcript',
      title: "United States Presidents' Inaugural Speeches (Project Gutenberg #925)",
      url: GUTENBERG_TXT_URL,
      publisher: 'Project Gutenberg',
    },
    topics: [
      { slug: 'governance', name: 'Governance' },
      { slug: 'economy', name: 'Economy' },
    ],
    maxQuotes: 30,
  },
];

function slugifyQuote(text: string, dateISO: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${dateISO}`;
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function sentenceSplit(text: string) {
  // Not NLP-perfect; good enough for seed.
  // Keep sentences that look like quotable clauses.
  const clean = normalizeWhitespace(text)
    .replace(/\u00a0/g, ' ')
    .replace(/“|”/g, '"')
    .replace(/’/g, "'");

  const parts = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"])/)
    .map((x) => x.trim())
    .filter(Boolean);

  const good = parts
    .map((s) => s.replace(/^[-–—]\s*/, '').trim())
    .filter((s) => s.length >= 40)
    .filter((s) => s.length <= 280)
    .filter((s) => !/^applause\.?$/i.test(s));

  // Deduplicate
  return [...new Set(good)];
}

let gutenbergCache: string | null = null;

async function fetchGutenbergText(): Promise<string> {
  if (gutenbergCache) return gutenbergCache;
  const res = await fetch(GUTENBERG_TXT_URL, {
    headers: {
      'user-agent': 'QuoteTimelineSeed/1.0 (https://github.com/maoryadin/quotetimeline)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch Gutenberg text: ${res.status}`);
  gutenbergCache = await res.text();
  return gutenbergCache;
}

function extractSection(full: string, startHeading: string) {
  const startIdx = full.indexOf(startHeading);
  if (startIdx === -1) throw new Error(`Could not find section start: ${startHeading}`);

  // Next section heading looks like: "SOMETHING, ... ADDRESS"
  const afterStart = full.slice(startIdx + startHeading.length);
  const m = afterStart.match(/\n\n[A-Z .'-]+, (FIRST|SECOND|THIRD|FOURTH )?INAUGURAL ADDRESS\n|\n\n[A-Z .'-]+, INAUGURAL ADDRESS\n/);
  const endIdx = m?.index ? startIdx + startHeading.length + m.index : Math.min(full.length, startIdx + 20000);

  return full.slice(startIdx, endIdx);
}

async function main() {
  const allTopics = new Map<string, { slug: string; name: string }>();
  for (const s of SPEECHES) for (const t of s.topics) allTopics.set(t.slug, t);

  // Upsert topics
  for (const t of allTopics.values()) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name },
      update: { name: t.name },
    });
  }

  for (const speech of SPEECHES) {
    const person = await prisma.person.upsert({
      where: { slug: speech.person.slug },
      create: {
        slug: speech.person.slug,
        name: speech.person.name,
        description: speech.person.description,
      },
      update: {
        name: speech.person.name,
        description: speech.person.description,
      },
    });

    const source = await prisma.source.upsert({
      where: { url: speech.source.url },
      create: {
        type: speech.source.type,
        title: speech.source.title,
        url: speech.source.url,
        publisher: speech.source.publisher,
      },
      update: {
        type: speech.source.type,
        title: speech.source.title,
        publisher: speech.source.publisher,
      },
    });

    const full = await fetchGutenbergText();
    const sectionText = extractSection(full, speech.sectionStart);
    const sentences = sentenceSplit(sectionText).slice(0, speech.maxQuotes);

    for (const sentence of sentences) {
      const slug = slugifyQuote(sentence, speech.dateISO);
      const date = new Date(`${speech.dateISO}T00:00:00.000Z`);

      await prisma.quote.upsert({
        where: { slug },
        create: {
          slug,
          text: sentence,
          date,
          context: `Excerpt from ${speech.source.title}.`,
          personId: person.id,
          sourceId: source.id,
          topics: {
            create: speech.topics.map((t) => ({
              topic: { connect: { slug: t.slug } },
            })),
          },
        },
        update: {
          text: sentence,
          date,
          context: `Excerpt from ${speech.source.title}.`,
          personId: person.id,
          sourceId: source.id,
        },
      });
    }
  }

  const quoteCount = await prisma.quote.count();
  console.log(`Seeded quotes: ${quoteCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
