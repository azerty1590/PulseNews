import { useState, useCallback } from 'react';

const KEY = 'newsboard:starred';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}

export function useStarred() {
  const [starred, setStarred] = useState(load);

  const toggleStar = useCallback((item) => {
    setStarred((prev) => {
      const exists = prev.some((s) => s.id === item.id && s.feedId === item.feedId);
      const next = exists
        ? prev.filter((s) => !(s.id === item.id && s.feedId === item.feedId))
        : [{ id: item.id, feedId: item.feedId, feedLabel: item.feedLabel, title: item.title, link: item.link, pubDate: item.pubDate, thumbnail: item.thumbnail, summary: item.summary }, ...prev];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isStarred = useCallback((item) =>
    starred.some((s) => s.id === item.id && s.feedId === item.feedId),
  [starred]);

  return { starred, toggleStar, isStarred };
}
