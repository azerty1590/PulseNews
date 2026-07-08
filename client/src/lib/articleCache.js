import { api } from './api.js';

/*
  Shared client-side article cache.

  Goals:
   - Instant display: a cached snapshot is returned synchronously (peek) or via
     a resolved promise, so tab switches / remounts don't re-hit the network.
   - Stale-while-revalidate: cached data is served immediately; if it's older
     than FRESH_MS a background refresh updates the cache and notifies listeners.
   - Dedup: concurrent requests for the same feed share one in-flight promise.
   - Cross-view sharing: the desktop grid (per-card) and the mobile/timeline
     aggregate views all read the same cache, so a feed is fetched once.
   - Survives reloads: snapshots are mirrored to sessionStorage.
*/

const FRESH_MS = 10 * 60_000;   // serve-then-revalidate threshold
const MAX_AGE_MS = 60 * 60_000; // hard cap — older than this, block on fetch
const SS_PREFIX = 'pulse:articles:';
const MAX_CONCURRENT = 4;       // cap simultaneous network fetches

const mem = new Map();       // feedId -> { data, fetchedAt }
const inFlight = new Map();  // feedId -> Promise<data>
const listeners = new Map(); // feedId -> Set<fn(data)>

// ── Concurrency-limited queue ──────────────────────────────────────────────
// Prevents N cards from firing N parallel requests at a free-tier server on
// load. Higher-priority tasks (visible cards) run first.
let active = 0;
const queue = []; // Array<{ run, priority }>

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    let bestIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].priority > queue[bestIdx].priority) bestIdx = i;
    }
    const { run } = queue.splice(bestIdx, 1)[0];
    active++;
    run().finally(() => { active--; pump(); });
  }
}

function enqueue(task, priority = 0) {
  return new Promise((resolve, reject) => {
    queue.push({ priority, run: () => task().then(resolve, reject) });
    pump();
  });
}

function ssRead(feedId) {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + feedId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch { return null; }
}

function ssWrite(feedId, entry) {
  try { sessionStorage.setItem(SS_PREFIX + feedId, JSON.stringify(entry)); } catch { /* quota */ }
}

function getEntry(feedId) {
  let entry = mem.get(feedId);
  if (!entry) {
    entry = ssRead(feedId);
    if (entry) mem.set(feedId, entry);
  }
  return entry ?? null;
}

function emit(feedId, data) {
  const set = listeners.get(feedId);
  if (set) for (const fn of set) { try { fn(data); } catch { /* ignore */ } }
}

// Fetch from network (via the concurrency queue), store, notify. Deduped per feed.
function refresh(feedId, { bust = false, priority = 0 } = {}) {
  if (inFlight.has(feedId)) return inFlight.get(feedId);
  const p = enqueue(() => api.getArticles(feedId, bust), priority)
    .then((data) => {
      const entry = { data, fetchedAt: Date.now() };
      mem.set(feedId, entry);
      ssWrite(feedId, entry);
      emit(feedId, data);
      return data;
    })
    .finally(() => inFlight.delete(feedId));
  inFlight.set(feedId, p);
  return p;
}

export const articleCache = {
  // Synchronous cached snapshot (or null). Use to paint instantly on mount.
  peek(feedId) {
    return getEntry(feedId)?.data ?? null;
  },

  // Returns cached data fast when possible, triggering a background refresh if
  // stale. Only blocks on the network when there is no usable cache.
  //   bust=true     -> force a network fetch (manual refresh)
  //   priority=1    -> jump the queue (visible cards) so on-screen loads first
  async get(feedId, { bust = false, priority = 0 } = {}) {
    const entry = getEntry(feedId);
    const age = entry ? Date.now() - entry.fetchedAt : Infinity;

    if (bust) return refresh(feedId, { bust: true, priority });

    // Usable cache — serve now
    if (entry && age < MAX_AGE_MS) {
      if (age >= FRESH_MS) refresh(feedId, { priority }).catch(() => {}); // revalidate in bg
      return entry.data;
    }

    // No / too-old cache — must fetch
    return refresh(feedId, { priority });
  },

  // Subscribe to background updates for a feed. Returns an unsubscribe fn.
  subscribe(feedId, fn) {
    let set = listeners.get(feedId);
    if (!set) { set = new Set(); listeners.set(feedId, set); }
    set.add(fn);
    return () => { set.delete(fn); if (!set.size) listeners.delete(feedId); };
  },

  // Drop a feed's cache (e.g. on delete).
  invalidate(feedId) {
    mem.delete(feedId);
    try { sessionStorage.removeItem(SS_PREFIX + feedId); } catch { /* ignore */ }
  },
};
