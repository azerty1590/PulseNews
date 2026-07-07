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

// GET with retry: retries when the server is sleeping (returns non-JSON / 502 / 503).
// Render free tier wakes on first request but returns an HTML splash page — that
// parses as null, so we treat null-parsed responses the same as 5xx and retry.
async function fetchJSON(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    // Always retry on gateway errors
    if (res.status === 502 || res.status === 503) {
      if (i < attempts - 1) { await delay(3000 * (i + 1)); continue; }
      throw new Error('Server unavailable after retries');
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    // Retry if we got a 200 but with non-JSON body (Render wake-up HTML splash)
    if (data === null && res.ok) {
      if (i < attempts - 1) { await delay(3000 * (i + 1)); continue; }
      throw new Error('Server is starting up, please refresh in a moment');
    }
    if (!res.ok) throw new Error(data?.error ?? (text.slice(0, 120) || res.statusText));
    return data;
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
