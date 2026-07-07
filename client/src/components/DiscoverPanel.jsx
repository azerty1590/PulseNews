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

function FaviconOrFallback({ url, label }) {
  const [failed, setFailed] = useState(false);
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}

  const colors = [
    'bg-indigo-500/20 text-indigo-300',
    'bg-violet-500/20 text-violet-300',
    'bg-cyan-500/20 text-cyan-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-rose-500/20 text-rose-300',
    'bg-amber-500/20 text-amber-300',
  ];
  const colorClass = colors[(label?.charCodeAt(0) ?? 0) % colors.length];

  if (failed || !domain) {
    return (
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colorClass}`}>
        {(label ?? domain ?? '?')[0].toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className="h-7 w-7 rounded-lg flex-shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function QualityDots({ quality }) {
  return (
    <div className="flex gap-0.5 items-center flex-shrink-0">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= (quality ?? 0) ? 'bg-indigo-400' : 'bg-white/10'}`}
        />
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

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-surface-1 p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex-shrink-0" />
        <div className="h-3.5 w-28 rounded bg-white/[0.06]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded bg-white/[0.04]" />
        <div className="h-2.5 w-3/4 rounded bg-white/[0.04]" />
      </div>
      <div className="flex gap-1.5 mt-auto">
        <div className="h-4 w-12 rounded-full bg-white/[0.04]" />
        <div className="h-4 w-14 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

function SuggestionCard({ s, onAdd, onRemove, isAdding, isRemoving, isAdded, isFollowed }) {
  let feedUrl = s.feedUrl ?? s.url ?? '';
  let domain = '';
  try { domain = new URL(feedUrl).hostname; } catch {}

  const following = isFollowed && !isAdded;

  return (
    <div className={`rounded-2xl border bg-surface-1 p-4 flex flex-col gap-3 transition-colors ${following ? 'border-indigo-500/20' : 'border-white/[0.07]'}`}>
      <div className="flex items-center gap-2.5">
        <FaviconOrFallback url={feedUrl} label={s.label} />
        <span className="text-sm font-semibold text-white/85 truncate flex-1 min-w-0">{s.label ?? domain}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {s.isNew && (
            <span className="text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 leading-none">
              New
            </span>
          )}
          <QualityDots quality={s.quality} />
        </div>
      </div>

      {s.description && (
        <p className="text-[12.5px] text-white/45 leading-relaxed line-clamp-2 flex-1">{s.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex gap-1 flex-wrap">
          {(s.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] rounded-full px-2 py-0.5 bg-white/[0.05] text-white/30 leading-none"
            >
              {tag}
            </span>
          ))}
        </div>

        {isAdded || following ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-indigo-400/70">Following</span>
            {isRemoving ? (
              <button disabled className="flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 bg-white/[0.04] text-white/20 disabled:cursor-not-allowed">
                <Spinner className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => onRemove(s)}
                className="text-xs rounded-lg px-2.5 py-1.5 bg-white/[0.04] text-white/25 hover:bg-red-500/15 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        ) : isAdding ? (
          <button disabled className="flex-shrink-0 flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 bg-white/[0.06] text-white/25 disabled:cursor-not-allowed">
            <Spinner className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={() => onAdd(s)}
            className="flex-shrink-0 text-xs rounded-lg px-3 py-1.5 bg-white/[0.06] hover:bg-indigo-500/20 hover:text-indigo-400 text-white/40 transition-colors"
          >
            ＋ Add
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPanel({ feeds, categories = [], onAdd, onRemove }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState('all');
  const [adding, setAdding] = useState(new Set());
  const [added, setAdded] = useState(new Set());
  const [removing, setRemoving] = useState(new Set());
  const [toastMsg, setToastMsg] = useState(null);

  const followedUrls = new Set(feeds.map((f) => f.url ?? f.feedUrl ?? '').filter(Boolean));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSuggestions();
      const list = Array.isArray(data) ? data : (data.suggestions ?? []);
      setSuggestions(scoreSuggestions(list, feeds, categories));
    } catch (ex) {
      setError(ex.message ?? 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [feeds]);

  useEffect(() => { load(); }, []);

  const tagCounts = {};
  for (const s of suggestions) {
    for (const t of s.tags ?? []) {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    }
  }
  const tags = ['all', ...Object.entries(tagCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t)];

  const filtered = (activeTag === 'all'
    ? suggestions
    : suggestions.filter((s) => (s.tags ?? []).includes(activeTag))
  ).slice(0, 50);

  async function handleAdd(s) {
    const feedUrl = s.feedUrl ?? s.url ?? '';
    setAdding((prev) => new Set(prev).add(feedUrl));
    try {
      await onAdd(feedUrl, s.label);
      setAdded((prev) => new Set(prev).add(feedUrl));
    } catch (ex) {
      const msg = ex.message ?? 'Failed to add feed';
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setAdding((prev) => { const next = new Set(prev); next.delete(feedUrl); return next; });
    }
  }

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

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white/90">Discover</h2>
          <p className="text-sm text-white/35 mt-0.5">Quality sources matched to your interests</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl p-2 text-white/30 hover:text-white/70 hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-5">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`flex-shrink-0 text-xs rounded-full px-3 py-1.5 transition-colors ${
              activeTag === tag
                ? 'bg-indigo-500 text-white'
                : 'bg-white/[0.05] text-white/40 hover:text-white/60 hover:bg-white/[0.08]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-white/25 text-sm">No suggestions found</p>
          <p className="text-white/15 text-xs mt-1">Try a different tag or refresh</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const feedUrl = s.feedUrl ?? s.url ?? '';
            return (
              <SuggestionCard
                key={feedUrl}
                s={s}
                onAdd={handleAdd}
                onRemove={handleRemove}
                isAdding={adding.has(feedUrl)}
                isRemoving={removing.has(feedUrl)}
                isAdded={added.has(feedUrl)}
                isFollowed={followedUrls.has(feedUrl)}
              />
            );
          })}
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-surface-1 border border-white/[0.10] px-4 py-2 text-sm text-red-400 shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
