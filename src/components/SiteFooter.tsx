export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <p>
            QuoteTimeline is an informational index. Not affiliated with or endorsed by any person or organization.
            Always verify claims using the linked primary source.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} QuoteTimeline</p>
        </div>
      </div>
    </footer>
  );
}
