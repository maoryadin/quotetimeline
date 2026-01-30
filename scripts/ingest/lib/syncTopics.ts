import type { PrismaClient } from '@prisma/client';

/**
 * Ensure a quote is connected to the given topic slugs.
 * Idempotent: uses QuoteTopic upserts on (quoteId, topicId).
 */
export async function ensureQuoteTopicLinks(
  prisma: PrismaClient,
  input: {
    quoteId: string;
    topicSlugs: string[];
  }
) {
  const slugs = [...new Set(input.topicSlugs.filter(Boolean))];
  if (!slugs.length) return;

  const topics = await prisma.topic.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  const found = new Set(topics.map((t) => t.slug));
  const missing = slugs.filter((s) => !found.has(s));
  if (missing.length) {
    throw new Error(`Topics missing in DB (did you forget to upsert them?): ${missing.join(', ')}`);
  }

  for (const t of topics) {
    await prisma.quoteTopic.upsert({
      where: { quoteId_topicId: { quoteId: input.quoteId, topicId: t.id } },
      create: { quoteId: input.quoteId, topicId: t.id },
      update: {},
    });
  }
}
