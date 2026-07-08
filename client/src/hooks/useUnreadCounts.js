import { useState, useEffect } from 'react';
import { articleCache } from '../lib/articleCache.js';
import { READ_CHANGED } from './useReadState.js';

const READ_KEY = 'newsboard:read';

function loadReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); } catch { return new Set(); }
}

// Per-feed unread counts, derived from the shared article cache + read-state.
// Recomputes when any feed's cache updates or when read-state changes.
// Returns { byFeed: { [feedId]: number } }.
export function useUnreadCounts(feeds) {
  const [byFeed, setByFeed] = useState({});

  useEffect(() => {
    if (!feeds || feeds.length === 0) { setByFeed({}); return; }

    let raf = 0;
    function recompute() {
      const readIds = loadReadIds();
      const map = {};
      for (const f of feeds) {
        const data = articleCache.peek(f.id);
        const items = data?.items ?? [];
        let unread = 0;
        for (const it of items) {
          if (!readIds.has(`${f.id}:${it.id}`)) unread++;
        }
        map[f.id] = unread;
      }
      setByFeed(map);
    }

    // Coalesce bursts of updates into a single recompute.
    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(recompute);
    }

    recompute();

    // Warm the cache for every feed at low priority so tab counts are accurate
    // even for feeds whose cards are off-screen (lazy-loaded). Visible cards
    // still fetch at high priority and jump ahead in the queue.
    for (const f of feeds) {
      articleCache.get(f.id, { priority: 0 }).then(schedule).catch(() => {});
    }

    // React to cache updates (background revalidations, first loads).
    const unsubs = feeds.map((f) => articleCache.subscribe(f.id, schedule));
    // React to read/unread changes.
    window.addEventListener(READ_CHANGED, schedule);
    window.addEventListener('storage', schedule); // cross-tab

    return () => {
      cancelAnimationFrame(raf);
      unsubs.forEach((u) => u());
      window.removeEventListener(READ_CHANGED, schedule);
      window.removeEventListener('storage', schedule);
    };
  }, [feeds]);

  return { byFeed };
}
