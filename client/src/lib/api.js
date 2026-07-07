const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api';

async function json(res) {
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error ?? (text.slice(0, 120) || res.statusText));
  return data;
}

export const api = {
  getFeeds: () => fetch(`${BASE}/feeds`).then(json),

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
    fetch(`${BASE}/feeds/${id}/articles${bust ? '?bust=1' : ''}`).then(json),

  getCategories: () => fetch(`${BASE}/categories`).then(json),
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
