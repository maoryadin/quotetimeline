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

## Vercel

- Add a Postgres database (Vercel Postgres / Neon / Supabase)
- Set `DATABASE_URL` in Vercel Project → Settings → Environment Variables
- Run these as **Build Commands** or as a one-time step in the Vercel DB console:
  - `npm run prisma:generate`
  - `npm run prisma:deploy`
  - `npm run db:seed`

## Notes

- The app now reads from Postgres (Prisma).
- The seed imports a small, source-backed starter set from U.S. National Archives presidential inaugural address transcripts.
- Before publishing at scale, review sources/robots, add rate limiting, and store per-quote deep links (not just the index page).

