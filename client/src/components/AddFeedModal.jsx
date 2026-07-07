import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api.js';

export default function AddFeedModal({ onAdd, onClose }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(null); // null | []
  const [selectedUrl, setSelectedUrl] = useState('');
  const [err, setErr] = useState('');
  const inputRef = useRef(null);
  const discoverTimerRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on backdrop click
  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose(); }

  // Auto-discover feeds when URL looks complete (has a dot and at least 4 chars after protocol)
  useEffect(() => {
    const trimmed = url.trim();
    clearTimeout(discoverTimerRef.current);
    setDiscovered(null);
    setSelectedUrl('');
    setErr('');

    const looksLikeUrl = /^(https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed);
    if (!looksLikeUrl || trimmed.length < 7) return;

    discoverTimerRef.current = setTimeout(async () => {
      setDiscovering(true);
      try {
        const { feeds } = await api.discoverFeeds(trimmed);
        if (feeds.length > 1) {
          setDiscovered(feeds);
          setSelectedUrl(feeds[0].url);
        } else {
          setDiscovered(null);
        }
      } catch {
        // Silently ignore discovery errors — user can still manually submit
      } finally {
        setDiscovering(false);
      }
    }, 800);

    return () => clearTimeout(discoverTimerRef.current);
  }, [url]);

  async function handleSubmit(e) {
    e.preventDefault();
    const effectiveUrl = (discovered && selectedUrl) ? selectedUrl : url.trim();
    if (!effectiveUrl) return;

    // Find title for the selected feed if picking from discovered list
    const pickedFeed = discovered?.find((f) => f.url === selectedUrl);
    const effectiveLabel = label.trim() || pickedFeed?.title || undefined;

    setSaving(true);
    setErr('');
    try {
      await onAdd(effectiveUrl, effectiveLabel);
      onClose();
    } catch (ex) {
      setErr(ex.message ?? 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={handleBackdrop}
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface-1 border border-white/[0.07] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">Add a source</h2>
            <p className="mt-0.5 text-xs text-white/40">Website, RSS feed, subreddit, or YouTube channel</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* URL field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">URL</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com  ·  r/webdev  ·  youtube.com/..."
                className="w-full rounded-xl bg-surface-2 border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors pr-8"
              />
              {discovering && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-3.5 w-3.5 text-white/30" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Feed picker — shown when multiple RSS feeds found */}
          {discovered && discovered.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
                Multiple feeds found — pick one
              </label>
              <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-none">
                {discovered.map((f) => (
                  <button
                    key={f.url}
                    type="button"
                    onClick={() => setSelectedUrl(f.url)}
                    className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm transition-colors border ${
                      selectedUrl === f.url
                        ? 'border-accent/40 bg-accent/10 text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/55 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    <p className="font-medium truncate">{f.title || f.url}</p>
                    <p className="text-[11px] text-white/25 truncate mt-0.5">{f.url}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Label field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
              Label <span className="text-white/25 normal-case tracking-normal font-normal">— optional</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                discovered?.find((f) => f.url === selectedUrl)?.title
                  ? `e.g. ${discovered.find((f) => f.url === selectedUrl).title}`
                  : 'e.g. Tech News'
              }
              className="w-full rounded-xl bg-surface-2 border border-white/[0.07] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {err && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-sm text-red-400">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 border border-white/[0.07] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !url.trim()}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Adding…' : 'Add source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
