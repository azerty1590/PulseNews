import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';
import { scoreSuggestions, tagsForCategory, matchesCategory, extractDomain } from '../lib/discoverEngine.js';

const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

function getSuggestions() {
  return fetch(`${BASE}/suggestions`).then(async (res) => {
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error ?? res.statusText);
    return data;
  });
}

// Mouse-wheel → horizontal scroll (releases at edges so the page scrolls).
function useWheelToHorizontal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e) {
      if (e.deltaY === 0) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const atStart = el.scrollLeft <= 0, atEnd = el.scrollLeft >= max - 1;
      if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return ref;
}

function Favicon({ url, label }) {
  const [failed, setFailed] = useState(false);
  const domain = extractDomain(url);
  const letter = (label ?? domain ?? '?')[0].toUpperCase();
  if (failed || !domain) {
    return (
      <div className="h-5 w-5 rounded-md bg-white/[0.08] text-white/50 flex items-center justify-center text-[10px] font-bold shrink-0">
        {letter}
      </div>
    );
  }
  return (
    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt=""
      className="h-5 w-5 rounded-md object-contain bg-white/[0.04] shrink-0"
      onError={() => setFailed(true)} />
  );
}

// Small dismiss (×) button — absolute top-right, revealed on hover.
function DismissBtn({ onDismiss }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
      title="Not interested"
      className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover/chip:opacity-100 transition-opacity rounded p-0.5 bg-surface-1 text-white/25 hover:text-white/60"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
      </svg>
    </button>
  );
}

// A recommended website (Add to this category).
function SiteChip({ s, onAdd, onDismiss, adding, added }) {
  const url = s.feedUrl ?? s.url ?? '';
  const siteUrl = s.url ?? s.feedUrl ?? '';
  return (
    <div className="group/chip relative flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-surface-1 px-3 py-2.5 w-[240px] h-[92px] shrink-0 snap-start hover:border-indigo-500/40 hover:bg-indigo-500/[0.04] hover:ring-1 hover:ring-indigo-500/20 transition-all duration-150">
      <DismissBtn onDismiss={onDismiss} />
      <a href={siteUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 min-w-0 pr-4 hover:opacity-80 transition-opacity" title={`Visit ${s.label}`}>
        <Favicon url={url} label={s.label} />
        <span className="text-[12.5px] font-semibold text-white/80 group-hover/chip:text-white truncate">{s.label}</span>
      </a>
      {s.description && <p className="text-[11px] text-white/35 leading-snug line-clamp-1 flex-1">{s.description}</p>}
      <div className="mt-auto flex justify-end">
        {added ? (
          <span className="text-[10px] text-indigo-400/70">Following</span>
        ) : (
          <button onClick={() => onAdd(s)} disabled={adding}
            className="text-[11px] rounded-lg px-2.5 py-1 bg-white/[0.06] hover:bg-indigo-500/20 hover:text-indigo-400 text-white/45 transition-colors disabled:opacity-50">
            {adding ? '…' : '＋ Add'}
          </button>
        )}
      </div>
    </div>
  );
}

// A recommended article.
function PickChip({ pick, onDismiss }) {
  return (
    <a href={pick.url} target="_blank" rel="noopener noreferrer"
      className="group/chip relative flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-surface-1 hover:border-indigo-500/40 hover:bg-indigo-500/[0.04] hover:ring-1 hover:ring-indigo-500/20 transition-all duration-150 px-3 py-2.5 w-[240px] h-[92px] shrink-0 snap-start">
      <DismissBtn onDismiss={onDismiss} />
      <div className="flex items-center gap-2 min-w-0 pr-4">
        <Favicon url={pick.url} label={pick.source} />
        <span className="text-[11px] text-white/35 truncate">{pick.source}</span>
      </div>
      <p className="text-[12px] font-medium text-white/75 leading-snug line-clamp-2">{pick.title}</p>
    </a>
  );
}

const DISMISSED_SITES_KEY = 'discover:dismissed';
const DISMISSED_PICKS_KEY = 'discover:dismissed-picks';

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return new Set(); }
}

/* Compact Discover strip shown inside a category tab. */
export default function DiscoverStrip({ category, feeds, allCategories, onAdd }) {
  const [suggestions, setSuggestions] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(new Set());
  const [added, setAdded] = useState(new Set());
  // Dismissals shared with the main Discover panel via the same localStorage keys.
  const [dismissedSites, setDismissedSites] = useState(() => loadSet(DISMISSED_SITES_KEY));
  const [dismissedPicks, setDismissedPicks] = useState(() => loadSet(DISMISSED_PICKS_KEY));
  const sitesRef = useWheelToHorizontal();
  const picksRef = useWheelToHorizontal();

  const dismissSite = useCallback((url) => {
    setDismissedSites((prev) => {
      const next = new Set(prev).add(url);
      localStorage.setItem(DISMISSED_SITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);
  const dismissPick = useCallback((id) => {
    setDismissedPicks((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem(DISMISSED_PICKS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const followedUrls = useMemo(
    () => new Set(feeds.map((f) => f.url ?? f.feedUrl ?? '').filter(Boolean)),
    [feeds]
  );

  // Feeds inside this category + the tag-set that describes it.
  const scopeFeeds = useMemo(() => {
    const ids = new Set(category.feedIds ?? []);
    return feeds.filter((f) => ids.has(f.id));
  }, [category, feeds]);
  const scopeTags = useMemo(() => tagsForCategory(category, scopeFeeds), [category, scopeFeeds]);

  // Load suggestions + category picks once (per category).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      getSuggestions(),
      api.getDailyPicks([category.name]),
    ]).then(([sug, pk]) => {
      if (cancelled) return;
      if (sug.status === 'fulfilled') {
        const list = Array.isArray(sug.value) ? sug.value : (sug.value?.suggestions ?? []);
        setSuggestions(scoreSuggestions(list, feeds, allCategories ?? []));
      }
      if (pk.status === 'fulfilled') setPicks(pk.value?.picks ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [category.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchedSites = useMemo(() =>
    suggestions
      .filter((s) => {
        const url = s.feedUrl ?? s.url ?? '';
        return url && !followedUrls.has(url) && !dismissedSites.has(url) && matchesCategory(s, scopeTags, category.name);
      })
      .slice(0, 12),
    [suggestions, followedUrls, dismissedSites, scopeTags, category.name]
  );

  const matchedPicks = useMemo(() =>
    picks.filter((p) => !dismissedPicks.has(p.id) && matchesCategory(p, scopeTags, category.name)).slice(0, 20),
    [picks, dismissedPicks, scopeTags, category.name]
  );

  const handleAdd = useCallback(async (s) => {
    const url = s.feedUrl ?? s.url ?? '';
    setAdding((prev) => new Set(prev).add(url));
    try {
      await onAdd(url, s.label, category.id); // add + assign to this category
      setAdded((prev) => new Set(prev).add(url));
    } catch { /* ignore */ }
    finally { setAdding((prev) => { const n = new Set(prev); n.delete(url); return n; }); }
  }, [onAdd, category.id]);

  // Nothing to show → render nothing (keeps the tab clean).
  if (!loading && matchedSites.length === 0 && matchedPicks.length === 0) return null;

  return (
    <div className="mb-2 pb-6 border-b border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-indigo-400/70">
          <path d="M7.657 1.05a.4.4 0 0 1 .686 0l1.263 2.19 2.19 1.263a.4.4 0 0 1 0 .686l-2.19 1.263-1.263 2.19a.4.4 0 0 1-.686 0L6.394 6.452 4.204 5.189a.4.4 0 0 1 0-.686l2.19-1.263L7.657 1.05Z" />
        </svg>
        <h3 className="text-sm font-semibold text-white/70">Discover more {category.name}</h3>
      </div>

      {/* Sources to follow */}
      {(loading || matchedSites.length > 0) && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-2">Sources to follow</p>
          {loading ? (
            <div className="flex gap-2 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[240px] h-[92px] rounded-xl border border-white/[0.06] bg-surface-1 animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div ref={sitesRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-6 -mx-1 px-1 snap-x overscroll-x-contain">
              {matchedSites.map((s) => {
                const url = s.feedUrl ?? s.url ?? '';
                return <SiteChip key={url} s={s} onAdd={handleAdd} onDismiss={() => dismissSite(url)} adding={adding.has(url)} added={added.has(url)} />;
              })}
            </div>
          )}
        </>
      )}

      {/* Article picks */}
      {!loading && matchedPicks.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-2">Today’s picks</p>
          <div ref={picksRef} className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1 snap-x overscroll-x-contain">
            {matchedPicks.map((p) => <PickChip key={p.id} pick={p} onDismiss={() => dismissPick(p.id)} />)}
          </div>
        </>
      )}
    </div>
  );
}
