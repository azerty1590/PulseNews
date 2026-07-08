import { useState, useRef } from 'react';
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

/* Source favicon derived from the article link, with a coloured-letter fallback */
function SourceIcon({ item, size = 'h-5 w-5' }) {
  const [failed, setFailed] = useState(false);
  let domain = '';
  try { domain = new URL(item.link).hostname; } catch {}
  const colour = feedColour(item.feedId);

  if (failed || !domain) {
    const letter = (item.feedLabel ?? '?')[0].toUpperCase();
    return (
      <span className={`${size} shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold ${colour} ${colour.replace('text-', 'bg-').replace('400', '500/15')}`}>
        {letter}
      </span>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt="" className={`${size} shrink-0 rounded-md object-contain bg-white/[0.04]`}
      onError={() => setFailed(true)}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="animate-shimmer rounded-2xl bg-surface-1 border border-white/[0.05] overflow-hidden">
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

/* Star button */
function StarBtn({ item, isStarred, onToggleStar }) {
  if (!onToggleStar) return null;
  const starred = isStarred?.(item);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(item); }}
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${starred ? 'text-amber-400' : 'text-white/20 hover:text-white/50'}`}
      aria-label={starred ? 'Unstar' : 'Star'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
      </svg>
    </button>
  );
}

/* Standard card — text left, thumbnail right, source + time as metadata */
function ArticleCard({ item, density = 'small', showSource = true, isStarred, onToggleStar, onPreview, readSet, onRead }) {
  const rel = relativeTime(item.pubDate);
  const full = fullDate(item.pubDate);
  const colour = feedColour(item.feedId);
  const showThumb = density !== 'compact' && item.thumbnail;
  const isRead = readSet?.has(`${item.feedId}::${item.id}`);
  const starred = isStarred?.(item);
  // Show real age when known, otherwise a subtle "recent" (source gave no date)
  const age = rel ?? 'recent';

  function handleClick(e) {
    e.preventDefault();
    onRead?.(item);
    onPreview ? onPreview(item) : window.open(item.link, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 px-2 py-3 rounded-xl active:bg-white/[0.04] transition-colors cursor-pointer ${isRead ? 'opacity-45' : ''}`}
    >
      <div className="flex-1 min-w-0">
        {/* Source (favicon + name) + time metadata line */}
        <div className="flex items-center gap-1.5 mb-1">
          <SourceIcon item={item} size="h-4 w-4" />
          {showSource && (
            <span className={`text-[11px] font-semibold truncate ${colour}`}>{item.feedLabel}</span>
          )}
          <span className="text-white/15 text-[10px]">·</span>
          <span className="shrink-0 text-[10px] text-white/30" title={full || 'No date provided by source'}>{age}</span>
          {starred && (
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 ml-auto shrink-0 text-amber-400">
              <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.75.75 0 0 1 3 14.25V2.75Z" />
            </svg>
          )}
        </div>
        <p className="text-[14px] font-medium leading-[1.35] text-white/85 line-clamp-2">{item.title}</p>
        {density === 'detailed' && item.summary && (
          <p className="mt-1 text-[12px] text-white/40 line-clamp-2 leading-relaxed">{item.summary}</p>
        )}
      </div>
      {showThumb && (
        <img src={item.thumbnail} alt=""
          className="h-14 w-14 shrink-0 rounded-xl object-cover opacity-90 mt-0.5"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}

/* Section divider with source name */
function SectionHeader({ label, colour, first = false }) {
  return (
    <div className={`flex items-center gap-2 ${first ? 'pt-1' : 'pt-5'} pb-2 px-1`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${colour}`}>{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

/* Source management sheet */
function SourceSheet({ feeds, categories, categoryOfFeed, onDelete, onRename, onAssign, onUnassign, onClose }) {
  const [editing, setEditing] = useState(null); // feedId being renamed
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef(null);

  function startEdit(feed) {
    setEditing(feed.id);
    setEditVal(feed.label);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function commitRename(id) {
    if (editVal.trim()) onRename?.(id, editVal.trim());
    setEditing(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      {/* backdrop */}
      <div className="flex-1 bg-black/60" />
      {/* sheet */}
      <div
        className="bg-surface-1 rounded-t-2xl border-t border-white/[0.07] max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <span className="text-sm font-semibold text-white/80">Sources</span>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pb-8">
          {feeds.map((feed) => {
            const cat = categoryOfFeed?.(feed.id);
            return (
              <div key={feed.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
                <div className={`h-2 w-2 rounded-full shrink-0 ${feedColour(feed.id).replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  {editing === feed.id ? (
                    <input
                      ref={inputRef}
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={() => commitRename(feed.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(feed.id); if (e.key === 'Escape') setEditing(null); }}
                      className="w-full bg-white/[0.07] rounded-lg px-2 py-1 text-sm text-white/90 outline-none ring-1 ring-accent/40"
                    />
                  ) : (
                    <>
                      <p className="text-sm text-white/80 truncate">{feed.label}</p>
                      {cat && <p className="text-[11px] text-white/30">{cat.name}</p>}
                    </>
                  )}
                </div>
                {/* rename */}
                {editing !== feed.id && (
                  <button onClick={() => startEdit(feed)} className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.473ZM4.75 13.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                    </svg>
                  </button>
                )}
                {/* assign category */}
                {categories?.length > 0 && (
                  <select
                    value={cat?.id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) onUnassign?.(feed.id);
                      else onAssign?.(feed.id, val);
                    }}
                    className="bg-white/[0.05] text-[11px] text-white/40 rounded-lg px-2 py-1 border border-white/[0.08] outline-none max-w-[90px] truncate"
                  >
                    <option value="">No tab</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {/* delete */}
                <button
                  onClick={() => { if (window.confirm(`Remove "${feed.label}"?`)) onDelete?.(feed.id); }}
                  className="p-1.5 text-white/15 hover:text-red-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── */
export default function MobileFeed({
  feeds,
  groupBySource,
  density = 'small',
  searchQuery = '',
  unreadOnly = false,
  isStarred,
  onToggleStar,
  onPreview,
  categories,
  categoryOfFeed,
  onDelete,
  onRename,
  onAssign,
  onUnassign,
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [readSet, setReadSet] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('newsboard:read') ?? '[]')); } catch { return new Set(); }
  });
  const [showSources, setShowSources] = useState(false);
  const { items, loading } = useAllArticles(feeds, refreshKey);

  function markRead(item) {
    const key = `${item.feedId}::${item.id}`;
    setReadSet((prev) => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem('newsboard:read', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const filtered = items.filter((item) => {
    if (unreadOnly && readSet.has(`${item.feedId}::${item.id}`)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(q) || item.feedLabel?.toLowerCase().includes(q);
    }
    return true;
  });

  const Toolbar = () => (
    <div className="flex items-center justify-between px-4 pt-1 pb-2">
      <button
        onClick={() => setRefreshKey((k) => k + 1)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.011.75.75 0 1 1-1.31-.734 6 6 0 0 1 9.46-1.348l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.46 1.348l-.842-.841v1.371a.75.75 0 0 1-1.5 0V9.698a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H4.061l.84.841a4.5 4.5 0 0 0 7.08-1.011.75.75 0 0 1 1.944.699Z" clipRule="evenodd" />
        </svg>
        Refresh
      </button>
      {feeds.length > 0 && (
        <button
          onClick={() => setShowSources(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Manage ({feeds.length})
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3 px-4 pt-2">
        <SkeletonCard />
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

  const sharedProps = { isStarred, onToggleStar, onPreview, readSet, onRead: markRead };

  const content = (() => {
    if (filtered.length === 0) {
      return (
        <p className="py-20 text-center text-sm text-white/25 px-4">
          {searchQuery ? 'No articles match your search' : unreadOnly ? 'All caught up!' : 'No articles yet — add some sources'}
        </p>
      );
    }

    if (groupBySource) {
      const grouped = {};
      for (const item of filtered) {
        if (!grouped[item.feedId]) grouped[item.feedId] = { label: item.feedLabel, id: item.feedId, items: [] };
        grouped[item.feedId].items.push(item);
      }
      return Object.values(grouped).map((group, gi) => (
        <div key={group.id}>
          <SectionHeader label={group.label} colour={feedColour(group.id)} first={gi === 0} />
          <div className="divide-y divide-white/[0.04]">
            {group.items.slice(0, 5).map((item) =>
              <ArticleCard key={item.id} item={item} density={density} showSource={false} {...sharedProps} />
            )}
          </div>
        </div>
      ));
    }

    return (
      <>
        <div className="divide-y divide-white/[0.04]">
          {filtered.map((item) => (
            <ArticleCard key={`${item.feedId}-${item.id}`} item={item} density={density} {...sharedProps} />
          ))}
        </div>
      </>
    );
  })();

  return (
    <div className="px-3 pb-8">
      <Toolbar />
      {content}
      {showSources && (
        <SourceSheet
          feeds={feeds}
          categories={categories}
          categoryOfFeed={categoryOfFeed}
          onDelete={onDelete}
          onRename={onRename}
          onAssign={onAssign}
          onUnassign={onUnassign}
          onClose={() => setShowSources(false)}
        />
      )}
    </div>
  );
}
