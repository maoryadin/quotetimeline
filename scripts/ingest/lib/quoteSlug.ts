import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

type EnsureNonCollidingSlugInput = {
  proposed: string;
  text: string;
  dateISO: string; // YYYY-MM-DD
  sourceUrl: string;
  personId: string;
  sourceId: string;
};

export function stableQuoteSlug(text: string, dateISO: string, sourceUrl: string, hashLen = 8) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  // Uniqueness + stability across sources even when the readable prefix collides.
  // Including sourceUrl prevents overwriting the same sentence that appears in multiple sources.
  const hash = createHash('sha1').update(`${text}|${dateISO}|${sourceUrl}`).digest('hex').slice(0, hashLen);
  return `${base}-${dateISO}-${hash}`;
}

export async function ensureNonCollidingSlug(prisma: PrismaClient, input: EnsureNonCollidingSlugInput) {
  const existing = await prisma.quote.findUnique({ where: { slug: input.proposed } });
  if (!existing) return input.proposed;

  const sameIdentity =
    existing.text === input.text &&
    existing.personId === input.personId &&
    existing.sourceId === input.sourceId &&
    existing.date.toISOString().slice(0, 10) === input.dateISO;

  // If it's the same quote (rerun ingest), keep the same slug.
  if (sameIdentity) return input.proposed;

  // Collision fallback: keep slugs stable by deterministically using a longer hash.
  const fallback = stableQuoteSlug(input.text, input.dateISO, input.sourceUrl, 12);
  if (fallback === input.proposed) {
    throw new Error(`Slug collision detected and fallback did not change: ${input.proposed}`);
  }

  const existingFallback = await prisma.quote.findUnique({ where: { slug: fallback } });
  if (!existingFallback) return fallback;

  const sameFallbackIdentity =
    existingFallback.text === input.text &&
    existingFallback.personId === input.personId &&
    existingFallback.sourceId === input.sourceId &&
    existingFallback.date.toISOString().slice(0, 10) === input.dateISO;

  if (sameFallbackIdentity) return fallback;

  throw new Error(
    `Unresolvable slug collision for ${input.sourceUrl} (${input.dateISO}). Proposed: ${input.proposed}, fallback: ${fallback}`
  );
}
