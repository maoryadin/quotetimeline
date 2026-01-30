# QuoteTimeline Backlog

This backlog is ordered roughly by **impact → effort**.

## Now (next 1–2 sessions)
1. **Data correctness (ingestion)**
   - Enforce unique, stable slugs on ingest (collision handling; avoid overwriting different quotes).
   - Add validation for `source.url` and `date` (fail fast on bad inputs).

2. **Information architecture polish**
   - Add filters: year, source type, topic.
   - Add pagination/infinite scroll on person/topic pages.

3. **Search improvements (performance + relevance)**
   - Evaluate Postgres FTS (tsvector) vs current Prisma `contains`.
   - Add indexes and basic ranking.

✅ Recently completed
- Removed sample-data coupling; data is DB-backed via Prisma.
- Added `/topics` + `/people` pages and updated header nav.
- Added per-page `generateMetadata()` + canonical URLs.

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
