import { useAllArticles } from '../hooks/useAllArticles.js';
import { relativeTime, fullDate } from '../lib/time.js';

const BADGE_COLOURS = [
  'bg-violet-500/15 text-violet-400',
  'bg-blue-500/15 text-blue-400',
  'bg-emerald-500/15 text-emerald-400',
  'bg-amber-500/15 text-amber-400',
  'bg-rose-500/15 text-rose-400',
  'bg-cyan-500/15 text-cyan-400',
  'bg-fuchsia-500/15 text-fuchsia-400',
  'bg-lime-500/15 text-lime-400',
];

function colourFor(feedId) {
  let h = 0;
  for (let i = 0; i < feedId.length; i++) h = (h * 31 + feedId.charCodeAt(i)) >>> 0;
  return BADGE_COLOURS[h % BADGE_COLOURS.length];
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-5 w-20 rounded-full bg-white/[0.05] animate-shimmer" /></td>
      <td className="px-4 py-3"><div className="h-3 rounded-full bg-white/[0.05] animate-shimmer" style={{ width: `${50 + Math.random() * 40}%` }} /></td>
      <td className="px-4 py-3 text-right"><div className="ml-auto h-3 w-12 rounded-full bg-white/[0.05] animate-shimmer" /></td>
    </tr>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25 w-36">Source</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25">Article</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-white/25 w-28">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading && Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-20 text-center text-sm text-white/25">
                  No articles yet — add some feeds
                </td>
              </tr>
            )}

            {!loading && items.map((item) => {
              const rel = relativeTime(item.pubDate);
              const full = fullDate(item.pubDate);
              const colour = colourFor(item.feedId);

              return (
                <tr key={`${item.feedId}-${item.id}`} className="group transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 align-top">
                    <span className={`inline-flex max-w-[8rem] items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${colour}`}
                      title={item.feedLabel}>
                      {item.feedLabel}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-medium text-white/70 group-hover:text-white transition-colors line-clamp-1 text-[13px]"
                    >
                      {item.title}
                    </a>
                    {item.summary && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/25">{item.summary}</p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right align-top">
                    {rel
                      ? <span className="text-xs text-white/25 whitespace-nowrap" title={full}>{rel}</span>
                      : <span className="text-white/15">—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && items.length > 0 && (
        <div className="border-t border-white/[0.05] px-4 py-2.5">
          <span className="text-[11px] text-white/20">{items.length} articles across {feeds.length} source{feeds.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
