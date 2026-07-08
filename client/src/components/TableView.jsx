import { useState } from 'react';
import { useAllArticles } from '../hooks/useAllArticles.js';
import { relativeTime, fullDate } from '../lib/time.js';

const DOT_COLOURS = [
  'text-violet-400', 'text-blue-400', 'text-emerald-400',
  'text-amber-400',  'text-rose-400', 'text-cyan-400',
  'text-fuchsia-400','text-lime-400',
];
function colourFor(feedId) {
  let h = 0;
  for (let i = 0; i < feedId.length; i++) h = (h * 31 + feedId.charCodeAt(i)) >>> 0;
  return DOT_COLOURS[h % DOT_COLOURS.length];
}

/* Source favicon derived from the article link, coloured-letter fallback */
function SourceIcon({ item }) {
  const [failed, setFailed] = useState(false);
  let domain = '';
  try { domain = new URL(item.link).hostname; } catch {}
  const colour = colourFor(item.feedId);

  if (failed || !domain) {
    const letter = (item.feedLabel ?? '?')[0].toUpperCase();
    return (
      <span className={`h-5 w-5 shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold ${colour} ${colour.replace('text-', 'bg-').replace('400', '500/15')}`}>
        {letter}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt="" className="h-5 w-5 shrink-0 rounded-md object-contain bg-white/[0.04]"
      onError={() => setFailed(true)}
    />
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-5 w-5 shrink-0 rounded-md bg-white/[0.05] animate-shimmer" />
      <div className="h-3 w-24 shrink-0 rounded-full bg-white/[0.05] animate-shimmer" />
      <div className="h-3 flex-1 rounded-full bg-white/[0.04] animate-shimmer" style={{ maxWidth: '60%' }} />
      <div className="ml-auto h-3 w-12 rounded-full bg-white/[0.04] animate-shimmer" />
    </div>
  );
}

export default function TableView({ feeds }) {
  const { items, loading, errors } = useAllArticles(feeds);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-surface-1 overflow-hidden animate-fadeIn">
      {errors.length > 0 && (
        <div className="border-b border-white/[0.06] bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400/70 space-y-1">
          <p className="font-medium">{errors.length} source{errors.length > 1 ? 's' : ''} failed to load:</p>
          {errors.map((e, i) => (
            <p key={i} className="text-amber-400/50">· <span className="font-medium text-amber-400/70">{e.label}</span> — {e.message}</p>
          ))}
        </div>
      )}

      <div className="divide-y divide-white/[0.04]">
        {loading && Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && items.length === 0 && (
          <p className="py-20 text-center text-sm text-white/25">No articles yet — add some feeds</p>
        )}

        {!loading && items.map((item) => {
          const rel = relativeTime(item.pubDate);
          const full = fullDate(item.pubDate);
          const colour = colourFor(item.feedId);
          const age = rel ?? 'recent';

          return (
            <a
              key={`${item.feedId}-${item.id}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
            >
              {/* Source: favicon + label (fixed width for timeline alignment) */}
              <div className="flex items-center gap-2 w-44 shrink-0 min-w-0">
                <SourceIcon item={item} />
                <span className={`text-[11px] font-semibold truncate ${colour}`} title={item.feedLabel}>
                  {item.feedLabel}
                </span>
              </div>

              {/* Title + summary */}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white/70 group-hover:text-white transition-colors truncate text-[13px]">
                  {item.title}
                </p>
                {item.summary && (
                  <p className="mt-0.5 truncate text-[11.5px] text-white/25">{item.summary}</p>
                )}
              </div>

              {/* Age */}
              <span className="shrink-0 text-[11px] text-white/25 whitespace-nowrap tabular-nums w-24 text-right"
                title={full || 'No date provided by source'}>
                {age}
              </span>
            </a>
          );
        })}
      </div>

      {!loading && items.length > 0 && (
        <div className="border-t border-white/[0.05] px-4 py-2.5">
          <span className="text-[11px] text-white/20">{items.length} articles across {feeds.length} source{feeds.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
