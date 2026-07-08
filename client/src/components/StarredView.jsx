import { relativeTime, fullDate } from '../lib/time.js';

/* Full-page Bookmarks view — rendered as a tab (like Discover), not a slide-in. */
export default function StarredView({ starred, onToggleStar, onAdd }) {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-400/80">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white/90">Bookmarks</h2>
            <p className="text-sm text-white/35 mt-0.5">
              {starred.length > 0 ? `${starred.length} saved article${starred.length === 1 ? '' : 's'}` : 'Articles you save appear here'}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {starred.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="h-12 w-12 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-white/15">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
            </svg>
          </div>
          <p className="text-sm text-white/30">No bookmarks yet</p>
          <p className="text-xs text-white/18 max-w-[240px]">Click the bookmark icon on any article to save it here for later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {starred.map((item) => {
            const rel = relativeTime(item.pubDate);
            const full = fullDate(item.pubDate);
            return (
              <div key={`${item.feedId}-${item.id}`}
                className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-surface-1 p-4 hover:border-white/[0.10] transition-colors">
                <div className="flex items-start gap-3">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover opacity-85"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-amber-400/60 mb-1 truncate">{item.feedLabel}</p>
                    <a href={item.link} target="_blank" rel="noopener noreferrer"
                      className="block text-[13.5px] font-medium text-white/80 hover:text-white transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </a>
                    {rel && <p className="mt-1.5 text-[11px] text-white/25" title={full}>{rel}</p>}
                  </div>
                </div>
                <button
                  onClick={() => onToggleStar(item)}
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 bg-surface-1 text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10"
                  title="Remove bookmark"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.75.75 0 0 1 3 14.25V2.75Z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
