import { useState, useEffect } from 'react';
import { articleCache } from '../lib/articleCache.js';

// Assign a sort timestamp to each item: real pubDate when present, else a
// synthetic time derived from the feed's newest known date so undated (scraped)
// items interleave near recent content instead of sinking to the bottom.
function withSortTs(rawItems, feed) {
  let newestTs = 0;
  for (const it of rawItems) {
    if (it.pubDate) {
      const t = new Date(it.pubDate).getTime();
      if (!Number.isNaN(t) && t > newestTs) newestTs = t;
    }
  }
  const base = newestTs || Date.now();
  return rawItems.map((item, idx) => {
    const realTs = item.pubDate ? new Date(item.pubDate).getTime() : NaN;
    const sortTs = Number.isNaN(realTs) ? base - idx * 60_000 : realTs;
    return { ...item, feedId: feed.id, feedLabel: feed.label, _sortTs: sortTs };
  });
}

// Fetches articles from all feeds, merges and sorts newest-first.
// Backed by the shared client cache: paints instantly from cache, then
// revalidates in the background (stale-while-revalidate).
export function useAllArticles(feeds, refreshKey = 0) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) { setItems([]); setErrors([]); return; }

    let cancelled = false;
    // Per-feed latest data, rebuilt into a sorted merged list on any change.
    const perFeed = new Map(); // feedId -> items[]
    const errs = [];

    function rebuild() {
      if (cancelled) return;
      const all = [];
      for (const list of perFeed.values()) all.push(...list);
      all.sort((a, b) => b._sortTs - a._sortTs);
      setItems(all);
      setErrors([...errs]);
    }

    // 1) Paint instantly from any cached snapshots.
    let hadAnyCache = false;
    for (const f of feeds) {
      const cached = articleCache.peek(f.id);
      if (cached) {
        hadAnyCache = true;
        perFeed.set(f.id, withSortTs(cached.items ?? [], f));
      }
    }
    if (hadAnyCache) rebuild();
    setLoading(!hadAnyCache); // only show skeletons when we have nothing to show

    // 2) Subscribe to background updates + kick off get() for each feed.
    const unsubs = feeds.map((f) =>
      articleCache.subscribe(f.id, (data) => {
        perFeed.set(f.id, withSortTs(data?.items ?? [], f));
        rebuild();
      })
    );

    const bust = refreshKey > 0;
    Promise.allSettled(
      feeds.map((f) =>
        articleCache.get(f.id, { bust }).then((data) => {
          perFeed.set(f.id, withSortTs(data?.items ?? [], f));
        }).catch((e) => {
          errs.push({ label: f.label ?? 'Unknown', message: e?.message ?? 'Unknown error' });
        })
      )
    ).then(() => {
      if (cancelled) return;
      setLoading(false);
      rebuild();
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [feeds, refreshKey]);

  return { items, loading, errors };
}
