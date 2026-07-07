import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

export function useFeeds() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const feedsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getFeeds();
      feedsRef.current = data;
      setFeeds(data);
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
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reorderFeeds = useCallback(async (reordered) => {
    const prev = feedsRef.current;
    feedsRef.current = reordered;
    setFeeds(reordered);
    try {
      await api.reorderFeeds(reordered.map((f, i) => ({ id: f.id, order: i + 1 })));
    } catch {
      feedsRef.current = prev;
      setFeeds(prev);
    }
  }, []);

  const renameFeed = useCallback(async (id, label) => {
    const updated = await api.renameFeed(id, label);
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, label: updated.label } : f)));
  }, []);

  return { feeds, loading, error, addFeed, deleteFeed, reorderFeeds, renameFeed };
}
