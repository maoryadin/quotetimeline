import { execFileSync } from 'node:child_process';
import { PrismaClient, SourceType } from '@prisma/client';
import { assertValidHttpUrl, toISODate } from './lib/validators';
import { ensureQuoteTopicLinks } from './lib/syncTopics';

const prisma = new PrismaClient();

type BirdTweet = {
  id: string;
  text: string;
  createdAt: string;
  conversationId?: string;
  author?: { username?: string; name?: string };
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function tweetUrl(username: string, id: string) {
  return `https://x.com/${username}/status/${id}`;
}

function uniq<T>(arr: T[]) {
  return [...new Set(arr)];
}

function extractHashtags(text: string) {
  const tags = [...text.matchAll(/#([A-Za-z0-9_]{2,64})/g)].map((m) => m[1]);
  return uniq(tags);
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

function safeSourceTitle(text: string) {
  const line = text.split(/\r?\n/)[0]?.trim() ?? 'X post';
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

function runBird(args: string[], env: Record<string, string>) {
  const buf = execFileSync('bird', args, { env: { ...process.env, ...env } });
  return buf.toString('utf8');
}

async function main() {
  const AUTH_TOKEN = getEnv('AUTH_TOKEN');
  const CT0 = getEnv('CT0');

  const username = process.env.INGEST_USERNAME ?? 'realDonaldTrump';
  const maxTweets = Number(process.env.INGEST_MAX_TWEETS ?? '200');
  const maxPages = Number(process.env.INGEST_MAX_PAGES ?? '10');

  // Fetch tweets (bird may return either an array or { tweets, nextCursor })
  const fetched: BirdTweet[] = [];
  let cursor: string | undefined = undefined;
  let pagesFetched = 0;

  while (fetched.length < maxTweets && pagesFetched < maxPages) {
    const remaining = maxTweets - fetched.length;
    const take = Math.min(remaining, 50);

    const args = [
      'user-tweets',
      `@${username}`,
      '-n',
      String(take),
      '--max-pages',
      '1',
      '--json',
      '--no-color',
      '--no-emoji',
      ...(cursor ? ['--cursor', cursor] : []),
    ];

    const json = runBird(args, { AUTH_TOKEN, CT0 });
    const parsed = JSON.parse(json) as unknown;

    if (Array.isArray(parsed)) {
      fetched.push(...(parsed as BirdTweet[]));
      break; // no cursor info in this mode
    }

    const obj = parsed as { tweets?: BirdTweet[]; nextCursor?: string };
    const batch = obj.tweets ?? [];
    if (!batch.length) break;

    fetched.push(...batch);
    pagesFetched += 1;

    cursor = obj.nextCursor;
    if (!cursor) break;
  }

  const tweets = fetched.slice(0, maxTweets);

  const personName = tweets.find((t) => t.author?.name)?.author?.name ?? 'Donald J. Trump';

  const person = await prisma.person.upsert({
    where: { slug: 'donald-trump' },
    create: {
      slug: 'donald-trump',
      name: personName,
      description:
        'A sourced index of verbatim quotes and timelines. Not affiliated with or endorsed by Donald J. Trump or any organization.',
    },
    update: { name: personName },
  });

  let kept = 0;
  let skippedReplies = 0;
  let skippedRetweets = 0;

  for (const t of tweets) {
    if (!t?.id || !t.text || !t.createdAt) continue;

    // Skip retweets (usually start with RT @...)
    if (/^RT\s+@/i.test(t.text.trim())) {
      skippedRetweets += 1;
      continue;
    }

    // Skip replies for v1 (noise). If you want them, remove this filter.
    if (t.conversationId && t.conversationId !== t.id) {
      skippedReplies += 1;
      continue;
    }

    const dateISO = toISODate(t.createdAt);
    const url = tweetUrl(username, t.id);
    assertValidHttpUrl(url);

    const hashtags = extractHashtags(t.text);
    const topics = hashtags
      .map((h) => ({ slug: slugifyTopic(h), name: `#${h}` }))
      .filter((x) => x.slug);

    for (const topic of topics) {
      await prisma.topic.upsert({
        where: { slug: topic.slug },
        create: { slug: topic.slug, name: topic.name },
        update: { name: topic.name },
      });
    }

    const source = await prisma.source.upsert({
      where: { url },
      create: {
        type: SourceType.post,
        title: safeSourceTitle(t.text),
        url,
        publisher: 'X',
      },
      update: {
        type: SourceType.post,
        title: safeSourceTitle(t.text),
        publisher: 'X',
      },
    });

    // One tweet = one quote.
    // Slug is stable and based on tweet id (no collisions). Still, fail fast if it would overwrite a different record.
    const slug = `x-${username}-${t.id}`;

    const existing = await prisma.quote.findUnique({ where: { slug } });
    if (existing) {
      const sameIdentity =
        existing.sourceId === source.id &&
        existing.personId === person.id &&
        existing.text === t.text.trim() &&
        existing.date.toISOString().slice(0, 10) === dateISO;

      if (!sameIdentity) {
        throw new Error(`Refusing to overwrite existing quote with same slug: ${slug} (${url})`);
      }
    }

    const quote = await prisma.quote.upsert({
      where: { slug },
      create: {
        slug,
        text: t.text.trim(),
        date: new Date(`${dateISO}T00:00:00.000Z`),
        context: null,
        personId: person.id,
        sourceId: source.id,
      },
      update: {
        text: t.text.trim(),
        date: new Date(`${dateISO}T00:00:00.000Z`),
        context: null,
        personId: person.id,
        sourceId: source.id,
      },
    });

    await ensureQuoteTopicLinks(prisma, {
      quoteId: quote.id,
      topicSlugs: topics.map((topic) => topic.slug),
    });

    kept += 1;
  }

  const quoteCount = await prisma.quote.count({ where: { person: { slug: 'donald-trump' } } });

  console.log(
    `Fetched ${tweets.length} tweets. Ingested ${kept}. Skipped replies: ${skippedReplies}. Skipped retweets: ${skippedRetweets}. Total Trump quotes: ${quoteCount}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
