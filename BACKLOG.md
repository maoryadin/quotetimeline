# QuoteTimeline Backlog

This backlog is ordered roughly by **impact → effort**.

## Now (next 1–2 sessions)
1. **Remove remaining sample-data coupling**
   - Ensure no UI imports from `src/lib/sample-data.ts`.
   - Decide: delete `sample-data.ts` or keep only for local dev/storybook.

2. **Navigation + IA polish**
   - Add `/topics` page (list topics with counts).
   - Update header nav to: Home / People / Topics / Trending / Search.

3. **Quote page SEO hardening**
   - Add per-page `generateMetadata()` for `/quote/[slug]`, `/person/[person]`, `/topic/[topic]`.
   - Add canonical URLs using `NEXT_PUBLIC_SITE_URL`.

4. **Data correctness**
   - Enforce unique, stable slugs on ingest (collision handling).
   - Add validation for `source.url` and `date`.

## Soon
5. **Search improvements (performance + relevance)**
   - Option A: Postgres FTS (tsvector) on Quote.text/context + Source.title + Person.name.
   - Option B: Meilisearch.
   - Add indexes and basic ranking.

6. **Pagination / infinite scroll**
   - Person and Topic pages paginate quotes (cursor by date).

7. **Admin / ingest workflow**
   - Add `scripts/ingest/*` with a single source to start (official transcripts).
   - Idempotent upserts (Person/Topic/Source/Quote).

## Later
8. **Monetization readiness**
   - About / Sources / Contact pages.
   - Ads policy checklist + analytics.

9. **Observability**
   - Add basic error reporting and performance monitoring.

## Open questions / inputs I need from you
- First target content source: which person/topic should we start with?
- SEO strategy: do we focus on one person first, or many people with fewer quotes each?
- Hosting DB: only Vercel Postgres, or also local/dev docker compose?
