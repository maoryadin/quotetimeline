export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

// UX pivot: QuoteTimeline is currently Trump-first. Keep this route for backwards compat.
export default async function PeoplePage() {
  redirect('/');
}
