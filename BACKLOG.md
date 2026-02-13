# QuoteTimeline Backlog

This backlog is ordered roughly by **impact → effort**.

## Now (next 1–2 sessions)
1. **Trump-only UX pivot**
   - Make `/` a Trump timeline (no “People”).
   - Update nav + hero copy to be Trump-focused.
   - Acceptance: landing page has a clear “Trump timeline” promise + no dead links to multi-person features.

2. **Content ingestion: first real Trump source (SEO engine)**
   - Decision: start with **The American Presidency Project** transcript pages (good coverage + stable URLs).
   - Implement ingest as an idempotent script (re-run safe) + document how to run it.
   - Output should include: counts (new/updated/skipped), and a short list of errors.
   - Acceptance: ingest produces 300+ quotes with stable slugs + primary source URLs.

3. **Data correctness (ingestion hardening)**
   - Enforce unique, stable slugs on ingest (collision handling; never overwrite a different quote).
   - Validate `source.url` and `date` (fail fast on bad inputs; log row-level errors).
   - Acceptance: re-running ingest on same input yields 0 duplicates and a deterministic summary.

4. **SEO: quote page upgrades (high ROI)**
   - Add schema.org structured data (Quote/Article) on `/quote/[slug]`.
   - Add “Related quotes” internal links (same topic + same source).
   - Acceptance: Rich Results Test passes; crawl finds internal links from quote pages.

5. **SEO: sitemap/indexation hardening for scale**
   - Ensure `/sitemap.xml` stays within Google limits (split sitemaps when needed) + includes `lastmod`.
   - Add a lightweight “indexation checklist” doc (canonicals, pagination prev/next, noindex rules for thin pages).
   - Acceptance: sitemaps validate; 0 duplicate canonical warnings in Search Console after ingest.

6. **Scrollytelling timeline (sticky chart updates as you scroll)**
   - Vertical feed of Trump quotes (cards).
   - One sticky chart that updates to the “active” card (IntersectionObserver).
   - Start with a 7-day window around the quote date.
   - Acceptance: scrolling through 20+ cards updates the chart with no jank (basic perf check in Lighthouse).

7. **Market data MVP (free/low-cost)**
   - Add daily S&P 500 + VIX series for the 7-day window.
   - Cache results in DB (avoid calling provider on every request).
   - Acceptance: repeated requests for same window do 0 external API calls after first fetch.

8. **Information architecture polish (Trump-first)**
   - Filters: year, source type, topic (Trump feed + topic pages).
   - Pagination/infinite scroll on the main Trump feed.

✅ Recently completed
- Removed sample-data coupling; data is DB-backed via Prisma.
- Added `/topics` and updated header nav.
- Added per-page `generateMetadata()` + canonical URLs.

## Soon
9. **Market reaction: simple “before/after” metric (makes the charts meaningful)**
   - For each quote, compute & display: 1d and 7d % change (S&P) + VIX delta over the same window.
   - Define which day is “t=0” (quote date in ET vs UTC) and document it.
   - Acceptance: quote card shows a small, consistent summary (e.g., “S&P +0.8% (1d), +1.9% (7d); VIX -0.6 (7d)”).

10. **Search improvements (performance + relevance)**
   - Option A: Postgres FTS (tsvector) on Quote.text/context + Source.title + Person.name.
   - Option B: Meilisearch.
   - Add indexes and basic ranking.

11. **Topic SEO: make topic hubs rankable**
   - Add short intro copy blocks per key Trump topic (economy, immigration, foreign policy, etc.).
   - Ensure pagination creates indexable pages with canonical prev/next.
   - Acceptance: topic pages have unique titles/descriptions + consistent internal links to quote pages.

12. **Pagination / infinite scroll (non-Trump pages)**
   - Person and Topic pages paginate quotes (cursor by date).

13. **Admin / ingest workflow**
   - Add `scripts/ingest/*` with a single source to start (American Presidency Project transcripts).
   - Idempotent upserts (Person/Topic/Source/Quote) + basic summary output (new/updated/skipped counts).

## Later
14. **Monetization readiness**
   - About / Sources / Contact pages.
   - Ads policy checklist + analytics.

15. **Observability**
   - Add basic error reporting and performance monitoring.

## Open questions / inputs I need from you
- Content source confirmation: OK to start with **The American Presidency Project** for Trump transcripts?
- Market reaction semantics: do we treat quote day as ET close, or “next trading day” when the quote is outside market hours?
- SEO strategy: do we go deep on one person first, or add a few other people with smaller datasets?
- Hosting DB: only Vercel Postgres, or also local/dev docker compose?
