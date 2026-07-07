import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

const STORAGE_KEY = 'newsboard:feeds';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; }
}

export function useFeeds() {
  const [feeds, setFeeds] = useState(loadLocal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const feedsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFeeds();
      feedsRef.current = data;
      if (data.length > 0) {
        setFeeds(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      // Server empty — keep localStorage feeds displayed, don't wipe them
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addFeed = useCallback(async (url, label) => {
    const newFeed = await api.addFeed(url, label);
    await load();
    return newFeed;
  }, [load]);

  const deleteFeed = useCallback(async (id) => {
    await api.deleteFeed(id);
    setFeeds((prev) => {
      const next = prev.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reorderFeeds = useCallback(async (reordered) => {
    const prev = feedsRef.current;
    feedsRef.current = reordered;
    setFeeds(reordered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
    try {
      await api.reorderFeeds(reordered.map((f, i) => ({ id: f.id, order: i + 1 })));
    } catch {
      feedsRef.current = prev;
      setFeeds(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    }
  }, []);

  const renameFeed = useCallback(async (id, label) => {
    const updated = await api.renameFeed(id, label);
    setFeeds((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, label: updated.label } : f));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { feeds, loading, error, addFeed, deleteFeed, reorderFeeds, renameFeed };
}
