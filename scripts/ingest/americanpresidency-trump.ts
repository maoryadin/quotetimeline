import { PrismaClient, SourceType } from '@prisma/client';
import { assertValidHttpUrl, toISODate } from './lib/validators';
import { ensureNonCollidingSlug, stableQuoteSlug } from './lib/quoteSlug';

const prisma = new PrismaClient();

const BASE = 'https://www.presidency.ucsb.edu';
const DEFAULT_START_URL = `${BASE}/people/president/donald-j-trump-1st-term`;

type IngestOptions = {
  startUrl: string;
  maxPages: number;
  maxDocs: number;
  sleepMs: number;
  maxQuotesPerDoc: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtmlEntities(input: string) {
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
      .trim(),
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
    .filter((s) => s.length <= 320);

  return [...new Set(good)];
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

function absolutize(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `${BASE}${href}`;
  return `${BASE}/${href}`;
}

function extractNextPage(html: string): string | null {
  const m =
    html.match(/title=\"Go to next page\"[^>]*href=\"([^\"]+)\"/i) ||
    html.match(/rel=\"next\"[^>]*href=\"([^\"]+)\"/i) ||
    html.match(/class=\"pager-next\"[\s\S]{0,300}?href=\"([^\"]+)\"/i);

  if (!m?.[1]) return null;
  return absolutize(m[1]);
}

function extractDocLinks(html: string): string[] {
  const out = new Set<string>();

  // The person page contains lots of /documents/* links. We'll collect and filter later at the doc-page level.
  const re = /href=\"(\/documents\/[^\"#?]+)\"/gi;
  for (let m; (m = re.exec(html)); ) {
    const href = m[1];
    if (!href) continue;
    out.add(absolutize(href));
  }

  return [...out];
}

function extractTitle(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : null;
}

function extractPublishedDate(html: string): string | null {
  // Example:
  // <span property="dc:date" datatype="xsd:dateTime" content="2020-10-30T00:00:00+00:00" ...>
  const m = html.match(/property=\"dc:date\"[^>]*content=\"([^\"]+)\"/i);
  if (!m?.[1]) return null;
  return toISODate(m[1], 'published date');
}

function extractBylinePerson(html: string): string | null {
  // Ensure the doc is actually a Trump doc (the person page can link to site help pages etc).
  const m = html.match(/field-docs-person[\s\S]{0,800}?<h3[^>]*>([\s\S]{0,200}?)<\/h3>/i);
  if (!m?.[1]) return null;
  const person = stripTags(m[1]);
  return person || null;
}

function extractDocContentText(html: string): string {
  const m = html.match(/<div class=\"field-docs-content\">([\s\S]*?)<\/div>/i);
  if (!m?.[1]) return '';

  const content = m[1];

  // Prefer paragraphs but keep some structure.
  const paras = [...content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((x) => stripTags(x[1]));
  const text = paras.filter(Boolean).join('\n');
  return text.trim();
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
    update: { name: 'Donald J. Trump' },
  });

  // Crawl the person page to collect document URLs.
  let pageUrl: string | null = opts.startUrl;
  const docUrls: string[] = [];

  for (let page = 0; page < opts.maxPages && pageUrl; page++) {
    const html = await fetchHtml(pageUrl);

    for (const u of extractDocLinks(html)) {
      if (docUrls.length >= opts.maxDocs) break;
      if (!docUrls.includes(u)) docUrls.push(u);
    }

    if (docUrls.length >= opts.maxDocs) break;

    pageUrl = extractNextPage(html);
    if (pageUrl) await sleep(opts.sleepMs);
  }

  let docsProcessed = 0;
  let quotesNew = 0;
  let quotesUpdated = 0;
  let quotesSkipped = 0;
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of docUrls) {
    if (docsProcessed >= opts.maxDocs) break;

    try {
      assertValidHttpUrl(url);

      const html = await fetchHtml(url);

      const byline = extractBylinePerson(html);
      if (!byline || !byline.toLowerCase().includes('donald j. trump')) {
        // Skip non-Trump docs.
        continue;
      }

      const title = extractTitle(html) ?? 'Document';
      const dateISO = extractPublishedDate(html);
      if (!dateISO) throw new Error('Missing published date');

      const body = extractDocContentText(html);
      if (!body) throw new Error('Missing transcript body');

      const source = await prisma.source.upsert({
        where: { url },
        create: {
          type: SourceType.transcript,
          title,
          url,
          publisher: 'presidency.ucsb.edu',
        },
        update: {
          type: SourceType.transcript,
          title,
          publisher: 'presidency.ucsb.edu',
        },
      });

      const quotes = sentenceSplit(body).slice(0, opts.maxQuotesPerDoc);

      for (const text of quotes) {
        const proposed = stableQuoteSlug(text, dateISO, url);
        const slug = await ensureNonCollidingSlug(prisma, {
          proposed,
          text,
          dateISO,
          sourceUrl: url,
          personId: person.id,
          sourceId: source.id,
        });

        const existing = await prisma.quote.findUnique({ where: { slug } });

        if (!existing) {
          quotesNew++;
        } else {
          const sameIdentity =
            existing.text === text &&
            existing.personId === person.id &&
            existing.sourceId === source.id &&
            existing.date.toISOString().slice(0, 10) === dateISO;

          if (sameIdentity) quotesSkipped++;
          else quotesUpdated++;
        }

        await prisma.quote.upsert({
          where: { slug },
          create: {
            slug,
            text,
            date: new Date(`${dateISO}T00:00:00.000Z`),
            context: `Excerpt from: ${title}.`,
            personId: person.id,
            sourceId: source.id,
          },
          update: {
            // Safety: only update mutable fields. Identity is enforced by slug + ensureNonCollidingSlug().
            text,
            date: new Date(`${dateISO}T00:00:00.000Z`),
            context: `Excerpt from: ${title}.`,
            personId: person.id,
            sourceId: source.id,
          },
        });
      }

      docsProcessed++;
      await sleep(opts.sleepMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ url, error: msg });
    }
  }

  return { docsProcessed, quotesNew, quotesUpdated, quotesSkipped, errors };
}

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

  const startUrl = String(args.startUrl ?? DEFAULT_START_URL);
  const maxPagesParam = Number(args.maxPages ?? '3');
  const maxDocsParam = Number(args.maxDocs ?? '50');
  const sleepMsParam = Number(args.sleepMs ?? process.env.INGEST_SLEEP_MS ?? '350');
  const maxQuotesPerDocParam = Number(args.maxQuotesPerDoc ?? '40');

  const opts: IngestOptions = {
    startUrl,
    maxPages: Number.isFinite(maxPagesParam) ? Math.max(1, Math.min(200, Math.floor(maxPagesParam))) : 3,
    maxDocs: Number.isFinite(maxDocsParam) ? Math.max(1, Math.min(2000, Math.floor(maxDocsParam))) : 50,
    sleepMs: Number.isFinite(sleepMsParam) ? Math.max(0, Math.min(2000, Math.floor(sleepMsParam))) : 350,
    maxQuotesPerDoc: Number.isFinite(maxQuotesPerDocParam)
      ? Math.max(5, Math.min(200, Math.floor(maxQuotesPerDocParam)))
      : 40,
  };

  console.log('[ingest:app] Starting:', opts);

  const res = await ingest(opts);
  const totalQuotes = await prisma.quote.count({ where: { person: { slug: 'donald-trump' } } });

  console.log(
    `[ingest:app] Docs processed=${res.docsProcessed} | quotes new=${res.quotesNew} updated=${res.quotesUpdated} skipped=${res.quotesSkipped} | total Trump quotes=${totalQuotes}`,
  );

  if (res.errors.length) {
    console.warn(`[ingest:app] Errors (${res.errors.length}):`);
    for (const e of res.errors.slice(0, 15)) {
      console.warn(`- ${e.url}: ${e.error}`);
    }
    if (res.errors.length > 15) console.warn(`... (${res.errors.length - 15} more)`);
  }
}

main()
  .catch((e) => {
    console.error('[ingest:app] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
