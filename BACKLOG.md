# QuoteTimeline Backlog

This backlog is ordered roughly by **impact → effort**.

## Now (next 1–2 sessions)
1. **Trump-only UX pivot**
   - Make `/` a Trump timeline (no “People”).
   - Update nav + copy to be Trump-focused.

2. **Scrolling chart (sticky, changes as you scroll)**
   - Feed of Trump posts/quotes.
   - One sticky chart that updates to the active post (IntersectionObserver).
   - Start with 7D window.

3. **Market data MVP (free/low-cost)**
   - Add daily S&P 500 + VIX series for 7D windows.
   - Cache results in DB (avoid calling provider on every request).

4. **Data correctness (ingestion)**
   - Enforce unique, stable slugs on ingest (collision handling; avoid overwriting different quotes).
   - Add validation for `source.url` and `date` (fail fast on bad inputs).

5. **Information architecture polish**
   - Filters: year, source type, topic.
   - Pagination/infinite scroll on the main Trump feed.

✅ Recently completed
- Removed sample-data coupling; data is DB-backed via Prisma.
- Added `/topics` and updated header nav.
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
