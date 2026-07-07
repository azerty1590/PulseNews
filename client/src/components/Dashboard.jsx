import { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useFeeds } from '../hooks/useFeeds.js';
import { useCategories } from '../hooks/useCategories.js';
import FeedCard from './FeedCard.jsx';
import AddFeedModal from './AddFeedModal.jsx';
import TableView from './TableView.jsx';
import CategoryTabs from './CategoryTabs.jsx';
import MobileFeed from './MobileFeed.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { useStarred } from '../hooks/useStarred.js';
import StarredPanel from './StarredPanel.jsx';
import ArticlePreviewPanel from './ArticlePreviewPanel.jsx';
import { useTitleCount } from '../hooks/useTitleCount.js';

/* ── icons ── */
const Svg = ({ d, size = 'h-4 w-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={size}>
    <path fillRule="evenodd" d={d} clipRule="evenodd" />
  </svg>
);
const D = {
  plus: 'M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z',
};


/* ── hook: detect mobile breakpoint ── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const fn = (e) => setMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return mobile;
}

/* ── empty state ── */
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center gap-6 py-28 sm:py-36 text-center px-6 animate-fadeIn">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/25">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-accent/80">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
        </svg>
        <div className="absolute inset-0 rounded-2xl bg-accent/5 blur-xl" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white/85">No sources yet</h2>
        <p className="text-sm text-white/35 max-w-[260px] mx-auto leading-relaxed">
          Add any website, RSS feed, subreddit, or YouTube channel
        </p>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all shadow-lg shadow-accent/25">
        <Svg d={D.plus} size="h-4 w-4" /> Add your first source
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { feeds, loading, error, addFeed, deleteFeed, reorderFeeds, renameFeed } = useFeeds();
  const { categories, addCategory, renameCategory, deleteCategory, assignFeed, unassignFeed, categoryOfFeed } = useCategories();
  const isMobile = useIsMobile();

  const [showModal,        setShowModal]        = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showStarred,      setShowStarred]      = useState(false);
  const [previewArticle,   setPreviewArticle]   = useState(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { starred, toggleStar, isStarred } = useStarred();
  const [desktopView, setDesktopView] = useState(() => localStorage.getItem('newsboard:view')    ?? 'grid');
  const [mobileView,  setMobileView]  = useState(() => localStorage.getItem('newsboard:mview')   ?? 'feed');
  const [activeTabId, setActiveTabId] = useState(() => localStorage.getItem('newsboard:tab') ?? 'all');
  const [cols,        setCols]        = useState(() => Number(localStorage.getItem('newsboard:cols')         ?? 3));
  const [density,     setDensity]     = useState(() => localStorage.getItem('newsboard:density')              ?? 'small');
  const [autoRefresh, setAutoRefresh] = useState(() => Number(localStorage.getItem('newsboard:autorefresh')  ?? 0));
  const [unreadOnly,  setUnreadOnly]  = useState(() => localStorage.getItem('newsboard:unreadonly') === 'true');

  function setActiveTabIdP(id) { setActiveTabId(id);    localStorage.setItem('newsboard:tab', id); }
  function setDesktopViewP(v)  { setDesktopView(v);     localStorage.setItem('newsboard:view', v); }
  function setMobileViewP(v)   { setMobileView(v);      localStorage.setItem('newsboard:mview', v); }
  function setColsP(n)         { setCols(n);             localStorage.setItem('newsboard:cols', n); }
  function setDensityP(v)      { setDensity(v);          localStorage.setItem('newsboard:density', v); }
  function setAutoRefreshP(v)  { setAutoRefresh(v);      localStorage.setItem('newsboard:autorefresh', v); }
  function setUnreadOnlyP(v)   { setUnreadOnly(v);        localStorage.setItem('newsboard:unreadonly', v); }

  const totalNew = useTitleCount();
  useEffect(() => {
    document.title = totalNew > 0 ? `(${totalNew} new) Pulse` : 'Pulse — News Reader';
  }, [totalNew]);

  const safeTabId = activeTabId === 'all' || categories.some((c) => c.id === activeTabId) ? activeTabId : 'all';
  const visibleFeeds = safeTabId === 'all'
    ? feeds
    : feeds.filter((f) => categories.find((c) => c.id === safeTabId)?.feedIds.includes(f.id));

  function onDragEnd({ source: s, destination: d }) {
    if (!d || s.index === d.index) return;
    const reordered = [...visibleFeeds];
    const [moved] = reordered.splice(s.index, 1);
    reordered.splice(d.index, 0, moved);
    if (activeTabId === 'all') { reorderFeeds(reordered); return; }
    const ids = reordered.map((f) => f.id);
    let vi = 0;
    reorderFeeds(feeds.map((f) => visibleFeeds.some((v) => v.id === f.id) ? feeds.find((x) => x.id === ids[vi++]) : f));
  }

  const showTabs = !loading && (feeds.length > 0 || categories.length > 0);
  const emptyCat  = !loading && feeds.length > 0 && visibleFeeds.length === 0 && safeTabId !== 'all';

  return (
    <div className="min-h-screen bg-surface flex flex-col">

      {/* ════════ HEADER ════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05]"
        style={{ background: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(14px)' }}>
        <div className="mx-auto max-w-screen-2xl">

          {/* ── toolbar row ── */}
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">

            {/* Logo */}
            <div className="flex items-center gap-2.5 select-none">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/20">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#818cf8" opacity=".9"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#818cf8" opacity=".55"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#818cf8" opacity=".55"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#818cf8" opacity=".25"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-white/90">Pulse</span>
            </div>

            {/* Search — desktop */}
            <div className="hidden sm:flex flex-1 max-w-xs mx-4 items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-1.5 ring-1 ring-transparent focus-within:ring-accent/30 focus-within:bg-white/[0.07] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white/25 shrink-0">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/20 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/20 hover:text-white/50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search — mobile icon button that expands */}
            {isMobile && !showMobileSearch && (
              <button
                onClick={() => setShowMobileSearch(true)}
                className="flex items-center justify-center rounded-lg p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors sm:hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* ml-auto pushes everything right on mobile */}
            <div className="flex-1 sm:hidden" />

            {/* Starred / bookmarks */}
            <button
              onClick={() => setShowStarred(true)}
              className="relative flex items-center justify-center rounded-lg p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="Bookmarks"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
              </svg>
              {starred.length > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Settings gear (desktop) */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center rounded-lg p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Mobile view toggle — "For you" / "By source" */}
            <div className="flex sm:hidden items-center rounded-lg bg-white/[0.05] p-0.5 gap-0.5">
              {[
                { val: 'feed',    label: 'For you' },
                { val: 'sources', label: 'Sources' },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setMobileViewP(val)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    mobileView === val ? 'bg-white/[0.12] text-white' : 'text-white/35'
                  }`}
                >{label}</button>
              ))}
            </div>

            {/* Add source */}
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all shadow-md shadow-accent/20">
              <Svg d={D.plus} size="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add source</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* ── mobile search row ── */}
          {isMobile && showMobileSearch && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-white/[0.04]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white/25 shrink-0">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/20 outline-none"
              />
              <button
                onClick={() => { setSearchQuery(''); setShowMobileSearch(false); }}
                className="text-white/30 hover:text-white/70 transition-colors px-1"
              >Cancel</button>
            </div>
          )}

          {/* ── category tabs row ── */}
          {showTabs && (
            <div className="border-t border-white/[0.04] px-4 sm:px-6">
              <CategoryTabs
                categories={categories}
                activeId={safeTabId}
                onSelect={setActiveTabIdP}
                onAdd={addCategory}
                onRename={renameCategory}
                onDelete={deleteCategory}
              />
            </div>
          )}
        </div>
      </header>

      {/* ════════ MAIN ══════════════════════════════════════════════════ */}
      <main className="flex-1 mx-auto w-full max-w-screen-2xl">

        {/* ── errors ── */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-red-500/15 bg-red-500/8 px-4 py-3 text-sm text-red-400/90">
            {error}
          </div>
        )}

        {/* ── empty: no feeds at all ── */}
        {!loading && feeds.length === 0 && <EmptyState onAdd={() => setShowModal(true)} />}

        {/* ── empty category ── */}
        {emptyCat && (
          <div className="flex flex-col items-center gap-3 py-28 text-center px-4 animate-fadeIn">
            <div className="h-11 w-11 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 text-white/25">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v-6A2.25 2.25 0 0 0 19.5 6H9.19" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/40">This category is empty</p>
            <p className="text-xs text-white/25 max-w-[220px]">Assign feeds here using the menu icon on any card</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            MOBILE  — article-first or by-source
        ══════════════════════════════════════════════ */}
        {!loading && visibleFeeds.length > 0 && isMobile && (
          <MobileFeed
            feeds={visibleFeeds}
            groupBySource={mobileView === 'sources'}
            density={density}
            searchQuery={searchQuery}
            unreadOnly={unreadOnly}
            isStarred={isStarred}
            onToggleStar={toggleStar}
            onPreview={(item) => setPreviewArticle({ item, feedLabel: visibleFeeds.find(f => f.id === item.feedId)?.label ?? '' })}
            categories={categories}
            categoryOfFeed={categoryOfFeed}
            onDelete={deleteFeed}
            onRename={(id, label) => renameFeed(id, label)}
            onAssign={(feedId, catId) => assignFeed(feedId, catId)}
            onUnassign={(feedId) => unassignFeed(feedId)}
          />
        )}

        {/* ══════════════════════════════════════════════
            DESKTOP — timeline table
        ══════════════════════════════════════════════ */}
        {!loading && visibleFeeds.length > 0 && !isMobile && desktopView === 'table' && (
          <div className="px-6 py-6">
            <TableView feeds={visibleFeeds} />
          </div>
        )}

        {/* ══════════════════════════════════════════════
            DESKTOP — card grid with loading skeleton
        ══════════════════════════════════════════════ */}
        {!isMobile && desktopView === 'grid' && (
          <div className="px-6 py-6">
            {loading ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                {Array.from({ length: cols * 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.05] bg-surface-1 overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2.5">
                      <div className="h-5 w-5 rounded bg-white/[0.06] animate-shimmer shrink-0" />
                      <div className="h-3 w-28 rounded-full bg-white/[0.07] animate-shimmer" />
                    </div>
                    <div className="p-3 space-y-px">
                      {[75,55,85,48,68].map((w,j) => (
                        <div key={j} className="flex gap-2.5 px-1 py-2.5">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.04] animate-shimmer" />
                          <div className="flex-1 space-y-2 pt-0.5">
                            <div className="h-2.5 rounded-full bg-white/[0.06] animate-shimmer" style={{ width:`${w}%` }} />
                            <div className="h-2 w-10 rounded-full bg-white/[0.03] animate-shimmer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleFeeds.length > 0 ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="feeds" direction="horizontal">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className="grid gap-4 items-start"
                      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                    >
                      {visibleFeeds.map((feed, index) => {
                        const cat = categoryOfFeed(feed.id);
                        return (
                          <FeedCard key={feed.id} feed={feed} index={index}
                            onDelete={deleteFeed}
                            onRename={(label) => renameFeed(feed.id, label)}
                            categories={categories}
                            currentCategoryId={cat?.id ?? null}
                            onAssign={(catId) => assignFeed(feed.id, catId)}
                            onUnassign={() => unassignFeed(feed.id)}
                            density={density}
                            searchQuery={searchQuery}
                            onToggleStar={toggleStar}
                            isStarred={isStarred}
                            autoRefresh={autoRefresh}
                            unreadOnly={unreadOnly}
                            onPreview={(item) => setPreviewArticle({ item, feedLabel: feed.label })}
                          />
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : null}
          </div>
        )}

        {/* mobile loading */}
        {loading && isMobile && (
          <MobileFeed feeds={[]} groupBySource={false} />
        )}
      </main>

      {showModal && <AddFeedModal onAdd={async (url, label) => {
          const feed = await addFeed(url, label);
          if (safeTabId !== 'all' && feed?.id) assignFeed(feed.id, safeTabId);
          return feed;
        }} onClose={() => setShowModal(false)} />}

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        desktopView={desktopView}
        setDesktopView={setDesktopViewP}
        cols={cols}
        setCols={setColsP}
        density={density}
        setDensity={setDensityP}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefreshP}
        unreadOnly={unreadOnly}
        setUnreadOnly={setUnreadOnlyP}
        feeds={feeds}
        onDeleteAllFeeds={() => { feeds.forEach((f) => deleteFeed(f.id)); }}
        categories={categories}
        onDeleteAllCategories={() => { categories.forEach((c) => deleteCategory(c.id)); }}
      />

      <StarredPanel
        open={showStarred}
        onClose={() => setShowStarred(false)}
        starred={starred}
        onToggleStar={toggleStar}
      />

      <ArticlePreviewPanel
        article={previewArticle?.item ?? null}
        feedLabel={previewArticle?.feedLabel ?? ''}
        onClose={() => setPreviewArticle(null)}
      />
    </div>
  );
}
