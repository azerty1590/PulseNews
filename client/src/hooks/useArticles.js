import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useArticles(feedId, refreshKey = 0, autoIntervalMs = 0) {
  const [articles, setArticles]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [newCount, setNewCount]     = useState(0);
  // ms until next auto-refresh (0 = no interval active)
  const [nextIn, setNextIn]         = useState(0);

  const knownIdsRef  = useRef(new Set());
  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);
  const nextInRef    = useRef(0);

  // Core fetch — bust=true forces cache bypass
  const doFetch = useCallback(async (bust = false) => {
    if (!feedId) return;
    try {
      const data = await api.getArticles(feedId, bust);
      if (!data || typeof data !== 'object') return;
      setArticles(data);
      setLastFetched(Date.now());
      setError(null);

      // Detect new items vs what we already knew about
      const incoming = new Set((data.items ?? []).map((i) => i.id));
      if (knownIdsRef.current.size > 0) {
        let fresh = 0;
        for (const id of incoming) {
          if (!knownIdsRef.current.has(id)) fresh++;
        }
        if (fresh > 0) setNewCount((prev) => prev + fresh);
      }
      knownIdsRef.current = incoming;
    } catch (e) {
      setError(e.message);
    }
  }, [feedId]);

  // Initial / manual refresh (shows loading spinner)
  useEffect(() => {
    if (!feedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNewCount(0);
    knownIdsRef.current = new Set();

    api.getArticles(feedId, refreshKey > 0)
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object') { setError('Server unavailable'); setLoading(false); return; }
        setArticles(data);
        setLastFetched(Date.now());
        setLoading(false);
        knownIdsRef.current = new Set((data.items ?? []).map((i) => i.id));
      })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [feedId, refreshKey]);

  // Auto-refresh interval + countdown ticker
  useEffect(() => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    nextInRef.current = 0;
    setNextIn(0);

    if (!autoIntervalMs || autoIntervalMs <= 0) return;

    nextInRef.current = autoIntervalMs;
    setNextIn(autoIntervalMs);

    // Countdown tick every second
    countdownRef.current = setInterval(() => {
      nextInRef.current = Math.max(0, nextInRef.current - 1000);
      setNextIn(nextInRef.current);
    }, 1000);

    // Background fetch on interval (no loading spinner, cache-bust)
    intervalRef.current = setInterval(() => {
      nextInRef.current = autoIntervalMs;
      setNextIn(autoIntervalMs);
      doFetch(true);
    }, autoIntervalMs);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [autoIntervalMs, doFetch]);

  const clearNew = useCallback(() => setNewCount(0), []);

  return { articles, loading, error, lastFetched, newCount, clearNew, nextIn, autoIntervalMs };
}
