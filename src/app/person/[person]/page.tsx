export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

// UX pivot: QuoteTimeline is currently Trump-first.
// Keep /person/[person] around for backwards-compat links, but avoid duplicate surfaces.
export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return {
    title: 'QuoteTimeline',
    alternates: { canonical: `${base}/` },
    robots: { index: false, follow: true },
  };
}

export default async function PersonPage() {
  redirect('/');
}
