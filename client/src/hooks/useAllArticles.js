import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

// Fetches articles from all feeds in parallel, merges and sorts by date desc.
export function useAllArticles(feeds, refreshKey = 0) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) { setItems([]); return; }

    setLoading(true);
    setErrors([]);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    Promise.allSettled(feeds.map((f, i) =>
      delay(i * 80).then(() => api.getArticles(f.id).then((data) => ({ feed: f, data })))
    ))
      .then((results) => {
        const errs = [];
        const all = [];
        for (const [i, r] of results.entries()) {
          if (r.status === 'fulfilled') {
            const { feed, data } = r.value;
            for (const item of data.items ?? []) {
              all.push({ ...item, feedId: feed.id, feedLabel: feed.label });
            }
          } else {
            errs.push({ label: feeds[i]?.label ?? 'Unknown', message: r.reason?.message ?? 'Unknown error' });
          }
        }
        // Sort newest first; items without a date go to the bottom
        all.sort((a, b) => {
          if (!a.pubDate && !b.pubDate) return 0;
          if (!a.pubDate) return 1;
          if (!b.pubDate) return -1;
          return new Date(b.pubDate) - new Date(a.pubDate);
        });
        setItems(all);
        setErrors(errs);
      })
      .finally(() => setLoading(false));
  }, [feeds, refreshKey]);

  return { items, loading, errors };
}
