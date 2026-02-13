# QuoteTimeline

A Next.js (App Router) starter for a sourced quote + timeline site.

## Run locally

### 1) Install

```bash
npm install
```

### 2) Configure Postgres

Set `DATABASE_URL` (example):

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/quotetimeline?schema=public"
```

### 3) Run migrations + seed

```bash
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
```

### 4) Start the app

```bash
npm run dev
```

Open http://localhost:3000

## Vercel Postgres

### Create + link the database
1. In Vercel, open your project.
2. Go to **Storage** → **Create Database** → **Postgres**.
3. Create the DB and **connect/link** it to this project (Vercel will offer this during creation).

### Environment variables
Vercel Postgres typically injects env vars like `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc.

This app expects **`DATABASE_URL`**.

Recommended mapping:
- Set `DATABASE_URL` = `POSTGRES_PRISMA_URL` (best for Prisma)

You can set it in **Project → Settings → Environment Variables** (Preview + Production).

### Migrations + seed
- One-time (or whenever schema changes):
  - `npm run prisma:deploy`
- One-time to load the starter dataset:
  - `npm run db:seed`
- Convenience (deploy + seed):
  - `npm run db:setup`

Where to run them:
- Locally (with `DATABASE_URL` pointed at the Vercel Postgres URL), or
- In Vercel (e.g. via a one-off CI job).

Notes:
- Don’t run `db:seed` on every deploy unless you intentionally want idempotent upserts each time.

## Ingest (build real Trump data)

This repo includes a few ingest scripts under `scripts/ingest/*`.

### The American Presidency Project (Trump)

Source: https://www.presidency.ucsb.edu/

This ingester crawls the Trump person page, visits document pages, and extracts quote-sized sentences.

Run (local):

```bash
# Make sure DATABASE_URL points at your Postgres (local or Vercel Postgres)
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/quotetimeline?schema=public"

# Ingest up to 3 listing pages / 50 documents by default
npm run ingest:app:trump

# Example: go bigger
npm run ingest:app:trump -- --maxPages=20 --maxDocs=500 --maxQuotesPerDoc=50 --sleepMs=350
```

Notes:
- It is designed to be **idempotent** (safe to rerun) and uses stable slugs (`stableQuoteSlug()` + collision guard).
- The script prints a deterministic summary: new/updated/skipped + a short error list.

## Notes

- The app now reads from Postgres (Prisma).
- The seed imports a small, source-backed starter set from public-domain U.S. presidential inaugural address transcripts (Project Gutenberg #925).
- Before publishing at scale, review sources/robots, add rate limiting, and store per-quote deep links (not just the index page).

