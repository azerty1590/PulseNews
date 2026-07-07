const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Parse response as JSON. Throws on HTTP errors with a readable message.
async function json(res) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error ?? (text.slice(0, 120) || res.statusText));
  return data;
}

// GET with retry — handles Render free-tier cold starts.
// Render wakes on first request but may return a 502/503 OR a 200 with an HTML
// splash page (non-JSON). We retry both cases with linear backoff.
async function fetchJSON(url, attempts = 8) {
  let lastErr = 'Server unavailable';
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 502 || res.status === 503) {
        lastErr = 'Server waking up…';
        if (i < attempts - 1) { await delay(2000 + i * 1000); continue; }
        break;
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }
      if (data === null && res.ok) {
        lastErr = 'Server waking up…';
        if (i < attempts - 1) { await delay(2000 + i * 1000); continue; }
        break;
      }
      if (!res.ok) throw new Error(data?.error ?? (text.slice(0, 120) || res.statusText));
      return data;
    } catch (e) {
      if (e.message && !e.message.includes('waking')) throw e; // real error, don't retry
      if (i < attempts - 1) await delay(2000 + i * 1000);
    }
  }
  throw new Error(lastErr);
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE ?? '');

// Used by the status indicator — single fast ping, no retry
export async function checkHealth() {
  const t = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, ms: Date.now() - t };
    return { ok: true, ms: Date.now() - t };
  } catch {
    return { ok: false, ms: null };
  }
}

export const api = {
  getFeeds: () => fetchJSON(`${BASE}/feeds`),

  addFeed: (url, label) =>
    fetch(`${BASE}/feeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label }),
    }).then(json),

  renameFeed: (id, label) =>
    fetch(`${BASE}/feeds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    }).then(json),

  deleteFeed: (id) =>
    fetch(`${BASE}/feeds/${id}`, { method: 'DELETE' }).then(json),

  reorderFeeds: (order) =>
    fetch(`${BASE}/feeds/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    }).then(json),

  getArticles: (id, bust = false) =>
    fetchJSON(`${BASE}/feeds/${id}/articles${bust ? '?bust=1' : ''}`),

  getCategories: () => fetchJSON(`${BASE}/categories`),
  addCategory: (name) =>
    fetch(`${BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(json),
  updateCategory: (id, data) =>
    fetch(`${BASE}/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json),
  deleteCategory: (id) =>
    fetch(`${BASE}/categories/${id}`, { method: 'DELETE' }).then(json),

  getArticleContent: (url) =>
    fetch(`${BASE}/article-content?url=${encodeURIComponent(url)}`).then(json),

  discoverFeeds: (url) =>
    fetch(`${BASE}/feeds/discover?url=${encodeURIComponent(url)}`).then(json),

  getSuggestions: () => fetch(`${BASE}/suggestions`).then(json),
};
