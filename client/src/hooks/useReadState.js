import { useState, useCallback } from 'react';

const KEY = 'newsboard:read';
const MAX_IDS = 5000;
export const READ_CHANGED = 'pulse:read-changed';

function load() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)) ?? []); } catch { return new Set(); }
}

// Notify any listeners (e.g. tab unread counters) that read-state changed.
function announce() {
  try { window.dispatchEvent(new CustomEvent(READ_CHANGED)); } catch { /* SSR */ }
}

function persist(set) {
  const arr = [...set];
  const trimmed = arr.length > MAX_IDS ? arr.slice(arr.length - MAX_IDS) : arr;
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  announce();
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
      announce();
      return next;
    });
  }, []);

  const isRead = useCallback((itemKey) => readIds.has(itemKey), [readIds]);

  return { markRead, markAllRead, markUnread, isRead, readIds };
}
