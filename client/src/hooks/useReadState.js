import { useState, useCallback } from 'react';

const KEY = 'newsboard:read';
const MAX_IDS = 5000;

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) ?? []); } catch { return new Set(); }
}

function persist(set) {
  const arr = [...set];
  const trimmed = arr.length > MAX_IDS ? arr.slice(arr.length - MAX_IDS) : arr;
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return new Set(trimmed);
}

export function useReadState() {
  const [readIds, setReadIds] = useState(load);

  const markRead = useCallback((itemKey) => {
    setReadIds((prev) => {
      if (prev.has(itemKey)) return prev;
      const next = new Set(prev);
      next.add(itemKey);
      return persist(next);
    });
  }, []);

  const markAllRead = useCallback((itemKeys) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const k of itemKeys) next.add(k);
      return persist(next);
    });
  }, []);

  const markUnread = useCallback((itemKey) => {
    setReadIds((prev) => {
      if (!prev.has(itemKey)) return prev;
      const next = new Set(prev);
      next.delete(itemKey);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isRead = useCallback((itemKey) => readIds.has(itemKey), [readIds]);

  return { markRead, markAllRead, markUnread, isRead, readIds };
}
