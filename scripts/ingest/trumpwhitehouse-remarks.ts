import { PrismaClient, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

const BASE = 'https://trumpwhitehouse.archives.gov';
const START_URL = `${BASE}/remarks/`;

type IngestOptions = {
  maxPosts: number;
  sleepMs: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtmlEntities(input: string) {
  // Minimal decode; good enough for WP content.
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function sentenceSplit(text: string) {
  const clean = normalizeWhitespace(text)
    .replace(/\u00a0/g, ' ')
    .replace(/“|”/g, '"')
    .replace(/’/g, "'");

  const parts = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"])|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const good = parts
    .map((s) => s.replace(/^[-–—]\s*/, '').trim())
    .filter((s) => s.length >= 40)
    .filter((s) => s.length <= 280);

  return [...new Set(good)];
}

function slugifyQuote(text: string, dateISO: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base}-${dateISO}`;
}

function assertValidHttpUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`Invalid URL protocol: ${url}`);
}

async function resolveUniqueQuoteSlug(baseSlug: string, text: string) {
  let slug = baseSlug;
  let n = 2;

  while (true) {
    const existing = await prisma.quote.findUnique({ where: { slug }, select: { text: true } });

    // If empty, we can safely create with this slug.
    if (!existing) return slug;

    // Idempotency: if the same content is already stored under this slug, re-use it.
    if (existing.text === text) return slug;

    // Collision: append a numeric suffix.
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'QuoteTimelineIngest/1.0 (https://github.com/maoryadin/quotetimeline)',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function extractListingLinks(html: string): string[] {
  // Collect remark post links.
  const re = /href="(https:\/\/trumpwhitehouse\.archives\.gov\/remarks\/[^"]+\/?)"/g;
  const out = new Set<string>();
  for (let m; (m = re.exec(html)); ) {
    const url = m[1].replace(/\/$/, '') + '/';
    out.add(url);
  }
  return [...out];
}

function extractNextPage(html: string): string | null {
  // WP "Next" pagination link.
  const m = html.match(/class="next page-numbers"[^>]*href="([^"]+)"/);
  if (!m) return null;
  const href = m[1];
  if (href.startsWith('http')) return href;
  return `${BASE}${href}`;
}

function extractMetaPublishedTime(html: string): string | null {
  const m = html.match(/property="article:published_time" content="([^"]+)"/);
  if (m) return m[1];
  const t = html.match(/<time[^>]*datetime="([^"]+)"/);
  return t ? t[1] : null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : null;
}

function extractTags(html: string): string[] {
  // WP tags are usually rel="tag".
  const re = /rel="tag"[^>]*>([\s\S]*?)<\/a>/g;
  const out = new Set<string>();
  for (let m; (m = re.exec(html)); ) {
    const t = stripTags(m[1]);
    if (t) out.add(t);
  }
  return [...out];
}

function slugifyTopic(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function extractEntryContentText(html: string): string {
  const m = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return '';

  // Prefer paragraphs.
  const content = m[1];
  const paras = [...content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((x) => stripTags(x[1]));
  const text = paras.filter(Boolean).join('\n');
  return normalizeWhitespace(text);
}

async function ingest(opts: IngestOptions) {
  const person = await prisma.person.upsert({
    where: { slug: 'donald-trump' },
    create: {
      slug: 'donald-trump',
      name: 'Donald J. Trump',
      description:
        'A sourced index of verbatim quotes and timelines. Not affiliated with or endorsed by Donald J. Trump or any organization.',
    },
    update: {
      name: 'Donald J. Trump',
    },
  });

  let pageUrl: string | null = START_URL;
  const postUrls: string[] = [];

  while (pageUrl && postUrls.length < opts.maxPosts) {
    const html = await fetchHtml(pageUrl);
    const links = extractListingLinks(html);
    for (const u of links) {
      if (postUrls.length >= opts.maxPosts) break;
      if (!postUrls.includes(u)) postUrls.push(u);
    }
    pageUrl = extractNextPage(html);
    if (pageUrl) await sleep(opts.sleepMs);
  }

  let ingested = 0;

  for (const url of postUrls) {
    assertValidHttpUrl(url);

    const html = await fetchHtml(url);
    const title = extractTitle(html) ?? 'Remarks';
    const published = extractMetaPublishedTime(html);
    if (!published) {
      // Skip if no date (rare).
      continue;
    }

    const date = new Date(published);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid published date: ${published} (${url})`);
    const dateISO = date.toISOString().slice(0, 10);

    const tags = extractTags(html);
    const topics = tags
      .map((t) => ({ name: t, slug: slugifyTopic(t) }))
      .filter((t) => t.slug && t.name);

    // Upsert topics.
    for (const t of topics) {
      await prisma.topic.upsert({
        where: { slug: t.slug },
        create: { slug: t.slug, name: t.name },
        update: { name: t.name },
      });
    }

    assertValidHttpUrl(url);

    const source = await prisma.source.upsert({
      where: { url },
      create: {
        type: SourceType.transcript,
        title,
        url,
        publisher: 'trumpwhitehouse.archives.gov',
      },
      update: {
        type: SourceType.transcript,
        title,
        publisher: 'trumpwhitehouse.archives.gov',
      },
    });

    const body = extractEntryContentText(html);
    if (!body) continue;

    const sentences = sentenceSplit(body).slice(0, 30);

    for (const sentence of sentences) {
      const baseSlug = slugifyQuote(sentence, dateISO);
      const slug = await resolveUniqueQuoteSlug(baseSlug, sentence);

      await prisma.quote.upsert({
        where: { slug },
        create: {
          slug,
          text: sentence,
          date: new Date(`${dateISO}T00:00:00.000Z`),
          context: `Excerpt from: ${title}.`,
          personId: person.id,
          sourceId: source.id,
          topics: {
            create: topics.map((t) => ({ topic: { connect: { slug: t.slug } } })),
          },
        },
        update: {
          text: sentence,
          date: new Date(`${dateISO}T00:00:00.000Z`),
          context: `Excerpt from: ${title}.`,
          personId: person.id,
          sourceId: source.id,
        },
      });
    }

    ingested += 1;
    await sleep(opts.sleepMs);
  }

  return { postsProcessed: ingested };
}

async function main() {
  const maxPosts = Number(process.env.INGEST_MAX_POSTS ?? '25');
  const sleepMs = Number(process.env.INGEST_SLEEP_MS ?? '400');

  const res = await ingest({ maxPosts, sleepMs });
  const quoteCount = await prisma.quote.count({ where: { person: { slug: 'donald-trump' } } });

  console.log(`Ingested posts: ${res.postsProcessed}. Total Trump quotes now: ${quoteCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
