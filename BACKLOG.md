# QuoteTimeline Backlog

This backlog is ordered roughly by **impact → effort**.

## Now (next 1–2 sessions)
1. **Trump-only UX pivot**
   - Make `/` a Trump timeline (no “People”).
   - Update nav + hero copy to be Trump-focused.
   - Acceptance: landing page has a clear “Trump timeline” promise + no dead links to multi-person features.

2. **Scrollytelling timeline (sticky chart updates as you scroll)**
   - Vertical feed of Trump quotes (cards).
   - One sticky chart that updates to the “active” card (IntersectionObserver).
   - Start with a 7-day window around the quote date.
   - Acceptance: scrolling through 20+ cards updates the chart with no jank (basic perf check in Lighthouse).

3. **Market data MVP (free/low-cost)**
   - Add daily S&P 500 + VIX series for the 7-day window.
   - Cache results in DB (avoid calling provider on every request).
   - Acceptance: repeated requests for same window do 0 external API calls after first fetch.

4. **Content ingestion: first real Trump source**
   - Pick 1 canonical source to start (e.g., official transcripts / debate transcripts / press briefings).
   - Implement ingest as an idempotent script (re-run safe) + document how to run it.
   - Acceptance: ingest produces 100+ quotes with stable slugs + primary source URLs.

5. **Data correctness (ingestion hardening)**
   - Enforce unique, stable slugs on ingest (collision handling; never overwrite a different quote).
   - Validate `source.url` and `date` (fail fast on bad inputs; log row-level errors).

6. **Information architecture polish (Trump-first)**
   - Filters: year, source type, topic (Trump feed + topic pages).
   - Pagination/infinite scroll on the main Trump feed.

✅ Recently completed
- Removed sample-data coupling; data is DB-backed via Prisma.
- Added `/topics` and updated header nav.
- Added per-page `generateMetadata()` + canonical URLs.

## Soon
7. **Search improvements (performance + relevance)**
   - Option A: Postgres FTS (tsvector) on Quote.text/context + Source.title + Person.name.
   - Option B: Meilisearch.
   - Add indexes and basic ranking.

8. **SEO: quote page upgrades (high ROI)**
   - Add schema.org structured data (Quote/Article) on `/quote/[slug]`.
   - Add “Related quotes” internal links (same topic + same source).
   - Acceptance: Rich Results Test passes; crawl finds internal links from quote pages.

9. **Pagination / infinite scroll (non-Trump pages)**
   - Person and Topic pages paginate quotes (cursor by date).

10. **Admin / ingest workflow**
   - Add `scripts/ingest/*` with a single source to start (official transcripts).
   - Idempotent upserts (Person/Topic/Source/Quote) + basic summary output (new/updated/skipped counts).

## Later
11. **Monetization readiness**
   - About / Sources / Contact pages.
   - Ads policy checklist + analytics.

12. **Observability**
   - Add basic error reporting and performance monitoring.

## Open questions / inputs I need from you
- First target content source: which person/topic should we start with?
- SEO strategy: do we focus on one person first, or many people with fewer quotes each?
- Hosting DB: only Vercel Postgres, or also local/dev docker compose?
