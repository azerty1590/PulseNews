import { useState, useRef, useEffect } from 'react';
import { useArticles } from '../hooks/useArticles.js';
import { useInView } from '../hooks/useInView.js';
import { useReadState } from '../hooks/useReadState.js';
import { dispatchNewCount } from '../hooks/useTitleCount.js';
import ArticleItem from './ArticleItem.jsx';
import AssignMenu from './AssignMenu.jsx';

/* ── source avatar — first letter + deterministic colour ── */
const AVATAR_COLOURS = [
  ['bg-violet-500/20 text-violet-400', 'ring-violet-500/20'],
  ['bg-blue-500/20 text-blue-400',     'ring-blue-500/20'],
  ['bg-emerald-500/20 text-emerald-400','ring-emerald-500/20'],
  ['bg-amber-500/20 text-amber-400',   'ring-amber-500/20'],
  ['bg-rose-500/20 text-rose-400',     'ring-rose-500/20'],
  ['bg-cyan-500/20 text-cyan-400',     'ring-cyan-500/20'],
  ['bg-fuchsia-500/20 text-fuchsia-400','ring-fuchsia-500/20'],
  ['bg-lime-500/20 text-lime-400',     'ring-lime-500/20'],
];

function avatarColour(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function SourceAvatar({ feed }) {
  const [bg, ring] = avatarColour(feed.id);
  const letter = (feed.label ?? '?')[0].toUpperCase();

  // Try to load favicon
  let faviconHost = '';
  try { faviconHost = new URL(feed.url).hostname; } catch {}

  const [imgOk, setImgOk] = useState(!!faviconHost);

  if (imgOk && faviconHost) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${faviconHost}&sz=32`}
        alt=""
        className="h-5 w-5 rounded shrink-0"
        onError={() => setImgOk(false)}
      />
    );
  }

  return (
    <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ring-1 ${bg} ${ring}`}>
      {letter}
    </span>
  );
}

/* ── skeleton ── */
function Skeleton() {
  return (
    <div className="px-1 py-1 space-y-px">
      {[72, 55, 88, 48, 66].map((w, i) => (
        <div key={i} className="flex gap-2.5 rounded-xl px-3 py-2.5">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.04] animate-shimmer" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-2.5 rounded-full bg-white/[0.06] animate-shimmer" style={{ width: `${w}%` }} />
            <div className="h-2 w-8 rounded-full bg-white/[0.03] animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── icon helpers ── */
function Ico({ path }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
  );
}

const REFRESH_PATH = 'M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.011.75.75 0 1 1-1.31-.734 6 6 0 0 1 9.46-1.348l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.46 1.348l-.842-.841v1.371a.75.75 0 0 1-1.5 0V9.698a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H4.061l.84.841a4.5 4.5 0 0 0 7.08-1.011.75.75 0 0 1 1.944.699Z';
const TRASH_PATH  = 'M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z';
const GRIP_DOTS   = 'M5 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z';

/* ── card ── */
export default function FeedCard({ feed, index, onDelete, onRename, categories, currentCategoryId, onAssign, onUnassign, density = 'small', searchQuery = '', onToggleStar, isStarred, autoRefresh = 0, unreadOnly = false, onPreview, isDragging = false, isDropTarget = false, onDragStart, onDragEnter, onDragEnd, onDrop }) {
  // Only allow dragging when grabbed by the handle (prevents accidental drags
  // while scrolling article lists or clicking links inside the card).
  const [dragEnabled, setDragEnabled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [showRead, setShowRead] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const cardRef = useRef(null);
  const isHoveredRef = useRef(false);
  const handleRefreshRef = useRef(null);
  const labelInputRef = useRef(null);
  // Defer network fetch until the card is near the viewport (prioritises
  // on-screen cards). Cached feeds still paint instantly regardless.
  const inView = useInView(cardRef);
  const { articles, loading, error, lastFetched, newCount, clearNew, nextIn } = useArticles(feed.id, refreshKey, autoRefresh, inView);
  const { markRead, markAllRead, markUnread, isRead } = useReadState();
  // Fixed card height per density so the grid renders as uniform rows.
  const cardH = density === 'compact' ? 360 : density === 'detailed' ? 520 : 420;

  // Broadcast new-article count so Dashboard can update the tab title.
  useEffect(() => {
    dispatchNewCount(feed.id, newCount);
    return () => dispatchNewCount(feed.id, 0);
  }, [feed.id, newCount]);

  // Keyboard navigation when card is hovered.
  useEffect(() => {
    function onKey(e) {
      if (!isHoveredRef.current) return;
      if (editingLabel) return;
      // Don't fire when typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const items = articles?.items ?? [];
      const q = searchQuery.trim().toLowerCase();
      const visible = q ? items.filter((i) => i.title?.toLowerCase().includes(q)) : items;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((p) => Math.min(p + 1, visible.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((p) => Math.max(p - 1, 0));
      } else if (e.key === 'p' && focusedIdx >= 0) {
        const item = visible[focusedIdx];
        if (item && onPreview) { markRead(`${feed.id}:${item.id}`); onPreview(item); }
      } else if ((e.key === 'o' || e.key === 'Enter') && focusedIdx >= 0) {
        const item = visible[focusedIdx];
        if (item) {
          markRead(`${feed.id}:${item.id}`);
          window.open(item.link, '_blank', 'noopener,noreferrer');
        }
      } else if (e.key === 'm' && focusedIdx >= 0) {
        const item = visible[focusedIdx];
        if (item) markRead(`${feed.id}:${item.id}`);
      } else if (e.key === 'r') {
        handleRefreshRef.current?.();
      } else if (e.key === 'Escape') {
        setFocusedIdx(-1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [articles, editingLabel, focusedIdx, feed.id, markRead, searchQuery]);

  function startEdit() {
    setLabelDraft(feed.label ?? '');
    setEditingLabel(true);
    setTimeout(() => { labelInputRef.current?.select(); }, 0);
  }

  async function submitLabel() {
    const trimmed = labelDraft.trim();
    setEditingLabel(false);
    if (trimmed && trimmed !== feed.label) {
      try { await onRename(trimmed); } catch {}
    }
  }

  function onLabelKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); submitLabel(); }
    if (e.key === 'Escape') setEditingLabel(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPageSize(10);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  }
  handleRefreshRef.current = handleRefresh;

  return (
        <div
          ref={cardRef}
          draggable={dragEnabled}
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('feedId', feed.id); onDragStart?.(); }}
          onDragEnter={(e) => { e.preventDefault(); onDragEnter?.(); }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
          onDrop={(e) => { e.preventDefault(); onDrop?.(); setDragEnabled(false); }}
          onDragEnd={() => { onDragEnd?.(); setDragEnabled(false); }}
          onMouseEnter={() => { isHoveredRef.current = true; }}
          onMouseLeave={() => { isHoveredRef.current = false; setFocusedIdx(-1); }}
          style={{ height: cardH }}
          className={`group/card flex flex-col rounded-2xl border transition-all duration-200 ${
            isDragging
              ? 'border-accent/30 bg-surface-1 opacity-30'
              : isDropTarget
                ? 'border-accent/50 bg-accent/5 ring-2 ring-accent/40 shadow-lg shadow-black/30'
                : 'border-white/[0.07] bg-surface-1 hover:border-white/[0.13] hover:shadow-lg hover:shadow-black/30'
          }`}
        >
          {/* ── Card header ── */}
          <div className="flex items-center gap-2 px-3 py-2">

            {/* Drag handle — hidden until hover. Grabbing here enables card dragging. */}
            <span
              onMouseDown={() => setDragEnabled(true)}
              onMouseUp={() => setDragEnabled(false)}
              className="cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity text-white/25 hover:text-white/60 -ml-1"
              title="Drag to reorder"
            >
              <Ico path={GRIP_DOTS} />
            </span>

            {/* Source avatar */}
            <SourceAvatar feed={feed} />

            {/* Feed label — double-click to rename */}
            {editingLabel ? (
              <input
                ref={labelInputRef}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={submitLabel}
                onKeyDown={onLabelKey}
                className="min-w-0 flex-1 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[13px] font-semibold text-white outline-none ring-1 ring-accent/50 leading-none"
                maxLength={80}
              />
            ) : (
              <span
                className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/80 leading-none cursor-text"
                title="Double-click to rename"
                onDoubleClick={startEdit}
              >
                {feed.label}
              </span>
            )}

            {/* ── Right slot: badges by default, actions on hover ── */}
            <div className="relative shrink-0 flex items-center justify-end">

              {/* Badges — visible by default, fade out on hover */}
              <div className="flex items-center gap-1.5 opacity-100 sm:group-hover/card:opacity-0 sm:group-hover/card:pointer-events-none transition-opacity">
                {/* Scraped badge */}
                {articles?.type === 'scraped' && (
                  <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400/60" title="No RSS feed found — showing scraped links">
                    scraped
                  </span>
                )}

                {/* "N new" badge */}
                {newCount > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 tabular-nums" title="New articles since last check">
                    +{newCount} new
                  </span>
                )}

                {/* Unread count badge */}
                {!loading && !error && (() => {
                  const all = articles?.items ?? [];
                  const unread = all.filter((i) => !isRead?.(`${feed.id}:${i.id}`));
                  if (unread.length === 0 && all.length > 0) {
                    return <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/25">all read</span>;
                  }
                  if (unread.length > 0) {
                    return (
                      <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent/80 tabular-nums">
                        {unread.length}
                      </span>
                    );
                  }
                  return null;
                })()}

                {/* Error indicator */}
                {error && !loading && (
                  <span className="h-2 w-2 rounded-full bg-red-500/80" title={`Error: ${error}`} />
                )}
              </div>

              {/* Actions — hidden by default, revealed on hover (overlays badges) */}
              <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 pointer-events-none sm:group-hover/card:opacity-100 sm:group-hover/card:pointer-events-auto transition-opacity bg-surface-1">
                {newCount > 0 && (
                  <button
                    onClick={clearNew}
                    className="rounded-lg p-1.5 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title="Dismiss new-article count"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.28 5.22a.75.75 0 0 0-1.06 1.06L6.94 8 5.22 9.72a.75.75 0 1 0 1.06 1.06L8 9.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L9.06 8l1.72-1.72a.75.75 0 0 0-1.06-1.06L8 6.94 6.28 5.22Z" />
                    </svg>
                  </button>
                )}
                {/* Mark all read */}
                {markAllRead && (articles?.items?.length ?? 0) > 0 && (
                  <button
                    onClick={() => {
                      const keys = (articles?.items ?? []).map((i) => `${feed.id}:${i.id}`);
                      markAllRead(keys);
                    }}
                    className="rounded-lg p-1.5 text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                    title="Mark all read"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <AssignMenu
                  categories={categories ?? []}
                  currentCategoryId={currentCategoryId}
                  onAssign={onAssign}
                  onUnassign={onUnassign}
                />
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-lg p-1.5 text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                  title="Refresh (hover card + press r)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                    className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}>
                    <path fillRule="evenodd" d={REFRESH_PATH} clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => { if (window.confirm(`Remove "${feed.label}"?`)) onDelete(feed.id); }}
                  className="rounded-lg p-1.5 text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove"
                >
                  <Ico path={TRASH_PATH} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="mx-3 h-px bg-white/[0.05]" />

          {/* ── Articles ── (flex-1 fills the fixed-height card → uniform rows) */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            {loading && <Skeleton />}
            {error && (
              <p className="m-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs text-red-400/90 leading-relaxed">{error}</p>
            )}
            {!loading && !error && articles?.items?.length === 0 && (
              <p className="py-12 text-center text-xs text-white/20">No articles found</p>
            )}
            {!loading && (() => {
              const q = searchQuery.trim().toLowerCase();
              const all = articles?.items ?? [];

              // Split into unread / read
              const unread = all.filter((i) => !isRead?.(`${feed.id}:${i.id}`));
              const readItems = all.filter((i) => isRead?.(`${feed.id}:${i.id}`));

              // Apply search on top
              const applySearch = (list) => q
                ? list.filter((i) => i.title?.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q))
                : list;

              const visibleUnread = applySearch(unread);
              // When unreadOnly is on globally, never show read items; otherwise respect local toggle
              const visibleRead   = (!unreadOnly && showRead) ? applySearch(readItems) : [];
              const combined = [...visibleUnread, ...visibleRead];
              const paged = combined.slice(0, pageSize);

              return (
                <>
                  {q && (
                    <p className="px-4 py-1.5 text-[11px] text-white/25">
                      {visibleUnread.length + (showRead ? visibleRead.length : 0)} result{visibleUnread.length + (showRead ? visibleRead.length : 0) !== 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Unread section label when read items exist and are shown */}
                  {showRead && visibleUnread.length > 0 && readItems.length > 0 && (
                    <p className="px-4 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/20">New</p>
                  )}

                  {paged.map((item, i) => {
                    const itemKey = `${feed.id}:${item.id}`;
                    const read = isRead ? isRead(itemKey) : false;
                    return (
                      <ArticleItem
                        key={item.id}
                        item={item}
                        density={density}
                        onToggleStar={onToggleStar}
                        isStarred={isStarred ? isStarred(item) : false}
                        isRead={read}
                        isFocused={focusedIdx === i}
                        onRead={() => markRead && markRead(itemKey)}
                        onMarkUnread={read ? () => markUnread && markUnread(itemKey) : undefined}
                        onPreview={onPreview ? () => { markRead(itemKey); onPreview(item); } : undefined}
                      />
                    );
                  })}

                  {combined.length > pageSize && (
                    <button
                      onClick={() => setPageSize((p) => p + 10)}
                      className="w-full py-2 text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-colors"
                    >
                      Show more ↓
                    </button>
                  )}

                  {/* Show/hide read toggle — hidden when unreadOnly mode is active */}
                  {!q && !unreadOnly && readItems.length > 0 && (
                    <button
                      onClick={() => setShowRead((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-white/20 hover:text-white/45 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04] mt-1"
                    >
                      {showRead ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                          </svg>
                          Hide read
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                          </svg>
                          {readItems.length} read
                        </>
                      )}
                    </button>
                  )}

                  {/* All-read empty state — not shown in unreadOnly mode (card just shows nothing) */}
                  {!q && !unreadOnly && visibleUnread.length === 0 && readItems.length > 0 && !showRead && (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-white/10">
                        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-[12px] text-white/25">All caught up</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── Footer ── */}
          {!loading && (articles?.items?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04]">
              <span className="text-[11px] text-white/18 tabular-nums">
                {articles.items.length} article{articles.items.length !== 1 ? 's' : ''}
              </span>
              <a
                href={articles.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/20 hover:text-accent transition-colors"
                title="Open source"
              >
                Visit source ↗
              </a>
            </div>
          )}

          {/* ── Auto-refresh countdown bar ── */}
          {autoRefresh > 0 && nextIn > 0 && (
            <div className="h-[2px] w-full overflow-hidden rounded-b-2xl bg-white/[0.04]">
              <div
                className="h-full bg-accent/40 transition-none"
                style={{ width: `${(nextIn / autoRefresh) * 100}%` }}
              />
            </div>
          )}
        </div>
  );
}
