import { useState } from 'react';
import { useAllArticles } from '../hooks/useAllArticles.js';
import { relativeTime, fullDate } from '../lib/time.js';

const BADGE_COLOURS = [
  'text-violet-400', 'text-blue-400', 'text-emerald-400',
  'text-amber-400',  'text-rose-400', 'text-cyan-400',
  'text-fuchsia-400','text-lime-400',
];
function feedColour(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BADGE_COLOURS[h % BADGE_COLOURS.length];
}

function SkeletonCard({ wide }) {
  return (
    <div className={`animate-shimmer rounded-2xl bg-surface-1 border border-white/[0.05] overflow-hidden ${wide ? 'col-span-2' : ''}`}>
      <div className="h-36 bg-white/[0.04]" />
      <div className="p-3 space-y-2">
        <div className="h-2 w-16 rounded-full bg-white/[0.05]" />
        <div className="h-3 rounded-full bg-white/[0.07]" />
        <div className="h-3 w-3/4 rounded-full bg-white/[0.06]" />
        <div className="h-2 w-10 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

/* Hero card — first article, full width, big image */
function HeroCard({ item }) {
  const rel = relativeTime(item.pubDate);
  const full = fullDate(item.pubDate);
  const colour = feedColour(item.feedId);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border border-white/[0.07] bg-surface-1 active:scale-[0.99] transition-transform"
    >
      {item.thumbnail && (
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1/90 via-transparent to-transparent" />
        </div>
      )}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`text-[11px] font-semibold ${colour}`}>{item.feedLabel}</span>
          {rel && <><span className="text-white/15 text-[10px]">·</span><span className="text-[11px] text-white/30" title={full}>{rel}</span></>}
        </div>
        <p className="text-[15px] font-semibold leading-snug text-white/90 line-clamp-3">{item.title}</p>
        {item.summary && (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40 line-clamp-2">{item.summary}</p>
        )}
      </div>
    </a>
  );
}

/* Standard card — image right, text left */
function ArticleCard({ item, density = 'small' }) {
  const rel = relativeTime(item.pubDate);
  const full = fullDate(item.pubDate);
  const colour = feedColour(item.feedId);
  const showThumb = density !== 'compact' && item.thumbnail;
  const lineClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-3';

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl px-1 py-3 border-b border-white/[0.05] active:bg-white/[0.03] transition-colors last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[11px] font-semibold ${colour}`}>{item.feedLabel}</span>
          {rel && <><span className="text-white/15 text-[10px]">·</span><span className="text-[11px] text-white/30" title={full}>{rel}</span></>}
        </div>
        <p className={`text-[13.5px] font-medium leading-snug text-white/80 ${lineClamp}`}>{item.title}</p>
        {density === 'detailed' && item.summary && (
          <p className="mt-1 text-[12px] text-white/40 line-clamp-2 leading-relaxed">{item.summary}</p>
        )}
      </div>
      {showThumb && (
        <img
          src={item.thumbnail}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover opacity-85"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </a>
  );
}

/* Section divider with source name */
function SectionHeader({ label, colour }) {
  return (
    <div className="flex items-center gap-2 pt-5 pb-1 px-1">
      <span className={`text-[11px] font-bold uppercase tracking-widest ${colour}`}>{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

export default function MobileFeed({ feeds, groupBySource, density = 'small' }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { items, loading } = useAllArticles(feeds, refreshKey);

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-2">
        <SkeletonCard wide />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-shimmer flex gap-3 py-3 border-b border-white/[0.05]">
            <div className="flex-1 space-y-2">
              <div className="h-2 w-20 rounded-full bg-white/[0.05]" />
              <div className="h-3 rounded-full bg-white/[0.07]" />
              <div className="h-3 w-4/5 rounded-full bg-white/[0.06]" />
            </div>
            <div className="h-16 w-16 shrink-0 rounded-xl bg-white/[0.05]" />
          </div>
        ))}
      </div>
    );
  }

  const RefreshBar = () => (
    <div className="flex justify-end px-4 pt-2 pb-1">
      <button
        onClick={() => setRefreshKey((k) => k + 1)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.011.75.75 0 1 1-1.31-.734 6 6 0 0 1 9.46-1.348l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.46 1.348l-.842-.841v1.371a.75.75 0 0 1-1.5 0V9.698a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H4.061l.84.841a4.5 4.5 0 0 0 7.08-1.011.75.75 0 0 1 1.944.699Z" clipRule="evenodd" />
        </svg>
        Refresh
      </button>
    </div>
  );

  if (items.length === 0) {
    return (
      <>
        <RefreshBar />
        <p className="py-20 text-center text-sm text-white/25 px-4">No articles yet — add some sources</p>
      </>
    );
  }

  if (groupBySource) {
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.feedId]) grouped[item.feedId] = { label: item.feedLabel, id: item.feedId, items: [] };
      grouped[item.feedId].items.push(item);
    }
    return (
      <div className="px-4 pb-8">
        <RefreshBar />
        {Object.values(grouped).map((group) => (
          <div key={group.id}>
            <SectionHeader label={group.label} colour={feedColour(group.id)} />
            {group.items.slice(0, 5).map((item, i) =>
              i === 0
                ? <HeroCard key={item.id} item={item} />
                : <ArticleCard key={item.id} item={item} density={density} />
            )}
          </div>
        ))}
      </div>
    );
  }

  const [hero, ...rest] = items;
  return (
    <div className="px-4 pb-8">
      <RefreshBar />
      <div className="pb-1">
        <HeroCard item={hero} />
      </div>
      <div className="mt-1">
        {rest.map((item) => <ArticleCard key={`${item.feedId}-${item.id}`} item={item} density={density} />)}
      </div>
    </div>
  );
}
