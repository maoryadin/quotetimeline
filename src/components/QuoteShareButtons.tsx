'use client';

import { useEffect, useState } from 'react';

type Props = {
  url: string;
  tweetText: string;
};

export function QuoteShareButtons({ url, tweetText }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        className="qt-focus rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Tweet
      </a>

      <button
        type="button"
        className="qt-focus rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:cursor-default disabled:opacity-70 dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
        onClick={() => {
          navigator.clipboard
            ?.writeText(url)
            .then(() => setCopied(true))
            .catch(() => {
              // Best-effort fallback: update selection-less state only.
              setCopied(true);
            });
        }}
        disabled={copied}
        aria-live="polite"
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
