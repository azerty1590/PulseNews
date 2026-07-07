import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { scoreSuggestions } from '../lib/discoverEngine.js';

const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

function getSuggestions() {
  return fetch(`${BASE}/suggestions`).then(async (res) => {
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error ?? (text.slice(0, 120) || res.statusText));
    return data;
  });
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function FaviconOrFallback({ url, label }) {
  const [failed, setFailed] = useState(false);
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}

  const colors = [
    'bg-indigo-500/20 text-indigo-300', 'bg-violet-500/20 text-violet-300',
    'bg-cyan-500/20 text-cyan-300', 'bg-emerald-500/20 text-emerald-300',
    'bg-rose-500/20 text-rose-300', 'bg-amber-500/20 text-amber-300',
  ];
  const colorClass = colors[(label?.charCodeAt(0) ?? 0) % colors.length];

  if (failed || !domain) {
    return (
      <div className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorClass}`}>
        {(label ?? domain ?? '?')[0].toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt="" className="h-6 w-6 rounded-md flex-shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function QualityDots({ quality }) {
  return (
    <div className="flex gap-0.5 items-center flex-shrink-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i <= (quality ?? 0) ? 'bg-indigo-400' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}

function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function SkeletonCard({ wide }) {
  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-surface-1 p-4 flex flex-col gap-3 animate-pulse ${wide ? '' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-6 rounded-md bg-white/[0.06] flex-shrink-0" />
        <div className="h-3 w-28 rounded bg-white/[0.06]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded bg-white/[0.04]" />
        <div className="h-2.5 w-3/4 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

// ── Daily Pick Card ───────────────────────────────────────────────────────────

function PickCard({ pick, onDismiss, dismissed }) {
  const isDismissed = dismissed.has(pick.id);
  if (isDismissed) return null;

  let domain = '';
  try { domain = new URL(pick.url).hostname.replace(/^www\./, ''); } catch {}

  return (
    <div className="group/pick flex gap-3 items-start rounded-xl border border-white/[0.06] bg-surface-1 px-4 py-3 hover:border-white/[0.10] hover:bg-white/[0.025] transition-colors">
      <FaviconOrFallback url={pick.url} label={pick.source} />
      <div className="min-w-0 flex-1">
        <a href={pick.url} target="_blank" rel="noopener noreferrer"
          className="text-[13px] font-medium text-white/75 hover:text-white/95 leading-snug line-clamp-2 transition-colors block">
          {pick.title}
        </a>
        <div className="flex items-center gap-2 mt-1.5">
          <a href={pick.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-white/30 hover:text-indigo-400/70 transition-colors shrink-0">
            {pick.source}
          </a>
          {pick.score > 0 && (
            <span className="text-[11px] text-white/20 tabular-nums">· {pick.score > 999 ? `${Math.round(pick.score / 1000)}k` : pick.score} pts</span>
          )}
          {(pick.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] rounded-full px-1.5 py-0.5 bg-white/[0.05] text-white/25 leading-none">{t}</span>
          ))}
        </div>
      </div>
      <button onClick={() => onDismiss(pick.id)} title="Not interested"
        className="opacity-0 group-hover/pick:opacity-100 transition-opacity shrink-0 mt-0.5 rounded p-0.5 text-white/20 hover:text-white/50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  );
}

// ── Source Suggestion Card ────────────────────────────────────────────────────

function SuggestionCard({ s, onAdd, onRemove, onDismiss, isAdding, isRemoving, isAdded, isFollowed }) {
  const feedUrl = s.feedUrl ?? s.url ?? '';
  const siteUrl = s.url ?? feedUrl;

  return (
    <div className={`group/card rounded-2xl border bg-surface-1 p-4 flex flex-col gap-3 transition-colors ${isFollowed || isAdded ? 'border-indigo-500/20' : 'border-white/[0.07]'}`}>
      <div className="flex items-center gap-2.5">
        <a href={siteUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <FaviconOrFallback url={feedUrl} label={s.label} />
          <span className="text-sm font-semibold text-white/85 truncate">{s.label}</span>
        </a>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {s.isNew && (
            <span className="text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 leading-none">New</span>
          )}
          <QualityDots quality={s.quality} />
          {!isFollowed && !isAdded && (
            <button onClick={() => onDismiss(s)} title="Not interested"
              className="opacity-0 group-hover/card:opacity-100 transition-opacity rounded p-0.5 text-white/20 hover:text-white/50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {s.description && (
        <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2 flex-1">{s.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex gap-1 flex-wrap">
          {(s.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] rounded-full px-2 py-0.5 bg-white/[0.05] text-white/30 leading-none">{tag}</span>
          ))}
        </div>
        {isAdded || isFollowed ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-indigo-400/70">Following</span>
            {isRemoving ? (
              <button disabled className="flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 bg-white/[0.04] text-white/20 disabled:cursor-not-allowed">
                <Spinner className="h-3 w-3" />
              </button>
            ) : (
              <button onClick={() => onRemove(s)}
                className="text-xs rounded-lg px-2.5 py-1.5 bg-white/[0.04] text-white/25 hover:bg-red-500/15 hover:text-red-400 transition-colors">
                Remove
              </button>
            )}
          </div>
        ) : isAdding ? (
          <button disabled className="flex-shrink-0 flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 bg-white/[0.06] text-white/25 disabled:cursor-not-allowed">
            <Spinner className="h-3 w-3" />
          </button>
        ) : (
          <button onClick={() => onAdd(s)}
            className="flex-shrink-0 text-xs rounded-lg px-3 py-1.5 bg-white/[0.06] hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 transition-colors">
            ＋ Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
        {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DiscoverPanel({ feeds, categories = [], onAdd, onRemove }) {
  // ── Sources state
  const [suggestions,  setSuggestions]  = useState([]);
  const [sugLoading,   setSugLoading]   = useState(true);
  const [sugError,     setSugError]     = useState(null);
  const [activeTag,    setActiveTag]    = useState('all');
  const [adding,       setAdding]       = useState(new Set());
  const [added,        setAdded]        = useState(new Set());
  const [removing,     setRemoving]     = useState(new Set());
  const [dismissed,    setDismissed]    = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('discover:dismissed') ?? '[]')); }
    catch { return new Set(); }
  });

  // ── Daily picks state
  const [picks,          setPicks]          = useState([]);
  const [picksLoading,   setPicksLoading]   = useState(true);
  const [picksError,     setPicksError]     = useState(null);
  const [picksRefreshedAt, setPicksRefreshedAt] = useState(null);
  const [picksRefreshing,  setPicksRefreshing]  = useState(false);
  const [dismissedPicks,   setDismissedPicks]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('discover:dismissed-picks') ?? '[]')); }
    catch { return new Set(); }
  });

  const [toastMsg, setToastMsg] = useState(null);

  const followedUrls = new Set(feeds.map((f) => f.url ?? f.feedUrl ?? '').filter(Boolean));
  const categoryNames = categories.map((c) => c.name);

  // ── Load sources
  const loadSuggestions = useCallback(async () => {
    setSugLoading(true);
    setSugError(null);
    try {
      const data = await getSuggestions();
      const list = Array.isArray(data) ? data : (data.suggestions ?? []);
      setSuggestions(scoreSuggestions(list, feeds, categories));
    } catch (ex) {
      setSugError(ex.message ?? 'Failed to load suggestions');
    } finally {
      setSugLoading(false);
    }
  }, [feeds, categories]);

  // ── Load daily picks
  const loadPicks = useCallback(async () => {
    setPicksLoading(true);
    setPicksError(null);
    try {
      const data = await api.getDailyPicks(categoryNames);
      setPicks(data.picks ?? []);
      setPicksRefreshedAt(data.refreshedAt ?? null);
    } catch (ex) {
      setPicksError(ex.message ?? 'Failed to load daily picks');
    } finally {
      setPicksLoading(false);
    }
  }, [categoryNames.join(',')]);

  useEffect(() => { loadSuggestions(); }, []);
  useEffect(() => { loadPicks(); }, []);

  // ── Manual force-refresh picks
  async function handleForceRefresh() {
    setPicksRefreshing(true);
    try {
      const data = await api.refreshDailyPicks(categoryNames);
      const freshData = await api.getDailyPicks(categoryNames);
      setPicks(freshData.picks ?? []);
      setPicksRefreshedAt(freshData.refreshedAt ?? null);
    } catch (ex) {
      setToastMsg(ex.message ?? 'Refresh failed');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setPicksRefreshing(false);
    }
  }

  // ── Source filter tags
  const tagCounts = {};
  for (const s of suggestions) {
    for (const t of s.tags ?? []) { tagCounts[t] = (tagCounts[t] ?? 0) + 1; }
  }
  const tags = ['all', ...Object.entries(tagCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t)];

  const filteredSuggestions = (activeTag === 'all'
    ? suggestions
    : suggestions.filter((s) => (s.tags ?? []).includes(activeTag))
  ).filter((s) => !dismissed.has(s.feedUrl ?? s.url ?? '')).slice(0, 50);

  // ── Dismiss source
  function handleDismissSource(s) {
    const feedUrl = s.feedUrl ?? s.url ?? '';
    setDismissed((prev) => {
      const next = new Set(prev).add(feedUrl);
      localStorage.setItem('discover:dismissed', JSON.stringify([...next]));
      return next;
    });
  }

  // ── Dismiss pick
  function handleDismissPick(id) {
    setDismissedPicks((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem('discover:dismissed-picks', JSON.stringify([...next]));
      return next;
    });
  }

  // ── Add source
  async function handleAdd(s) {
    const feedUrl = s.feedUrl ?? s.url ?? '';
    setAdding((prev) => new Set(prev).add(feedUrl));
    try {
      await onAdd(feedUrl, s.label);
      setAdded((prev) => new Set(prev).add(feedUrl));
    } catch (ex) {
      setToastMsg(ex.message ?? 'Failed to add feed');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setAdding((prev) => { const next = new Set(prev); next.delete(feedUrl); return next; });
    }
  }

  // ── Remove source
  async function handleRemove(s) {
    const feedUrl = s.feedUrl ?? s.url ?? '';
    const feed = feeds.find((f) => (f.url ?? f.feedUrl ?? '') === feedUrl);
    if (!feed) return;
    setRemoving((prev) => new Set(prev).add(feedUrl));
    try {
      await onRemove(feed.id);
      setAdded((prev) => { const next = new Set(prev); next.delete(feedUrl); return next; });
    } catch (ex) {
      setToastMsg(ex.message ?? 'Failed to remove feed');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setRemoving((prev) => { const next = new Set(prev); next.delete(feedUrl); return next; });
    }
  }

  // ── Refresh label
  function refreshLabel(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.round((now - d) / 3600000);
    if (diffH < 1) return 'Updated just now';
    if (diffH < 24) return `Updated ${diffH}h ago`;
    return `Updated ${Math.round(diffH / 24)}d ago`;
  }

  const visiblePicks = picks.filter((p) => !dismissedPicks.has(p.id));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">

      {/* ── Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold text-white/90">Discover</h2>
          <p className="text-sm text-white/35 mt-0.5">Daily picks and sources matched to your interests</p>
        </div>
      </div>

      {/* ════ TODAY'S PICKS ════ */}
      <section className="mb-10">
        <SectionHeader
          title="Today's picks"
          subtitle={picksRefreshedAt ? refreshLabel(picksRefreshedAt) : undefined}
          action={
            <button
              onClick={handleForceRefresh}
              disabled={picksRefreshing || picksLoading}
              title="Refresh now"
              className="rounded-xl p-2 text-white/30 hover:text-white/70 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              <RefreshIcon spinning={picksRefreshing} />
            </button>
          }
        />

        {picksLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} wide />)}
          </div>
        )}

        {!picksLoading && picksError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">{picksError}</div>
        )}

        {!picksLoading && !picksError && visiblePicks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-white/25 text-sm">No picks yet</p>
            <p className="text-white/15 text-xs mt-1">Try refreshing — the server fetches fresh content daily</p>
          </div>
        )}

        {!picksLoading && !picksError && visiblePicks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {visiblePicks.slice(0, 40).map((pick) => (
              <PickCard key={pick.id} pick={pick} onDismiss={handleDismissPick} dismissed={dismissedPicks} />
            ))}
          </div>
        )}
      </section>

      {/* ════ SOURCES TO FOLLOW ════ */}
      <section>
        <SectionHeader
          title="Sources to follow"
          subtitle="Curated feeds matched to your categories"
          action={
            <button
              onClick={loadSuggestions}
              disabled={sugLoading}
              title="Refresh"
              className="rounded-xl p-2 text-white/30 hover:text-white/70 hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              <RefreshIcon spinning={false} />
            </button>
          }
        />

        {/* Tag filter pills */}
        {!sugLoading && !sugError && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-4">
            {tags.map((tag) => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                className={`flex-shrink-0 text-xs rounded-full px-3 py-1.5 transition-colors ${
                  activeTag === tag
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/[0.05] text-white/40 hover:text-white/60 hover:bg-white/[0.08]'
                }`}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {sugLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!sugLoading && sugError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">{sugError}</div>
        )}

        {!sugLoading && !sugError && filteredSuggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-white/25 text-sm">No suggestions found</p>
            <p className="text-white/15 text-xs mt-1">Try a different tag or refresh</p>
          </div>
        )}

        {!sugLoading && !sugError && filteredSuggestions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSuggestions.map((s) => {
              const feedUrl = s.feedUrl ?? s.url ?? '';
              return (
                <SuggestionCard
                  key={feedUrl}
                  s={s}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  onDismiss={handleDismissSource}
                  isAdding={adding.has(feedUrl)}
                  isRemoving={removing.has(feedUrl)}
                  isAdded={added.has(feedUrl)}
                  isFollowed={followedUrls.has(feedUrl)}
                />
              );
            })}
          </div>
        )}
      </section>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-surface-1 border border-white/[0.10] px-4 py-2 text-sm text-red-400 shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
