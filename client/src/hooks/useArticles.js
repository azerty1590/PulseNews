import { useState, useEffect, useRef, useCallback } from 'react';
import { articleCache } from '../lib/articleCache.js';

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

  // Apply a fresh data payload: update state + detect new items vs. known ids.
  const applyData = useCallback((data) => {
    setArticles(data);
    setLastFetched(Date.now());
    setError(null);
    const incoming = new Set((data?.items ?? []).map((i) => i.id));
    if (knownIdsRef.current.size > 0) {
      let fresh = 0;
      for (const id of incoming) if (!knownIdsRef.current.has(id)) fresh++;
      if (fresh > 0) setNewCount((prev) => prev + fresh);
    }
    knownIdsRef.current = incoming;
  }, []);

  // Core fetch — bust=true forces cache bypass (manual/auto refresh)
  const doFetch = useCallback(async (bust = false) => {
    if (!feedId) return;
    try {
      const data = await articleCache.get(feedId, { bust });
      applyData(data);
    } catch (e) {
      setError(e.message);
    }
  }, [feedId, applyData]);

  // Initial / manual refresh. Paints instantly from cache, revalidates in bg.
  useEffect(() => {
    if (!feedId) return;
    let cancelled = false;
    setNewCount(0);
    knownIdsRef.current = new Set();

    // Instant paint from shared cache when available.
    const cached = articleCache.peek(feedId);
    if (cached && refreshKey === 0) {
      setArticles(cached);
      setLastFetched(Date.now());
      setLoading(false);
      knownIdsRef.current = new Set((cached.items ?? []).map((i) => i.id));
    } else {
      setLoading(true);
    }
    setError(null);

    // Subscribe so background revalidations (from any view) update this card.
    const unsub = articleCache.subscribe(feedId, (data) => {
      if (!cancelled) applyData(data);
    });

    articleCache.get(feedId, { bust: refreshKey > 0 })
      .then((data) => {
        if (cancelled) return;
        applyData(data);
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; unsub(); };
  }, [feedId, refreshKey, applyData]);

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
