import { useState, useEffect } from 'react';

const EVENT = 'pulse:new-count';

// Dispatched by FeedCard whenever its newCount changes.
export function dispatchNewCount(feedId, count) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { feedId, count } }));
}

// Dashboard uses this to track total new articles across all cards.
export function useTitleCount() {
  const [map, setMap] = useState({});

  useEffect(() => {
    function handler(e) {
      const { feedId, count } = e.detail;
      setMap((prev) => {
        if (prev[feedId] === count) return prev;
        return { ...prev, [feedId]: count };
      });
    }
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const total = Object.values(map).reduce((s, n) => s + n, 0);
  return total;
}
