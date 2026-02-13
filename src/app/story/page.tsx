export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

// Backwards-compat: /story was renamed to /scrolly.
export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return {
    title: 'QuoteTimeline',
    alternates: { canonical: `${base}/scrolly` },
    robots: { index: false, follow: true },
  };
}

export default async function StoryRedirectPage() {
  redirect('/scrolly');
}
