// In-memory store used when Firebase credentials are not configured.

let feeds = [];
let categories = [];

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const memStore = {
  list() {
    return [...feeds].sort((a, b) => a.order - b.order);
  },
  add(data) {
    const maxOrder = feeds.reduce((m, f) => Math.max(m, f.order ?? 0), 0);
    const feed = { ...data, id: nextId(), order: maxOrder + 1 };
    feeds.push(feed);
    return feed;
  },
  remove(id) {
    feeds = feeds.filter((f) => f.id !== id);
  },
  reorder(orderArr) {
    for (const { id, order } of orderArr) {
      const f = feeds.find((x) => x.id === id);
      if (f) f.order = order;
    }
  },
  get(id) {
    return feeds.find((f) => f.id === id) ?? null;
  },
  patch(id, data) {
    const f = feeds.find((x) => x.id === id);
    if (f) Object.assign(f, data);
    return f ?? null;
  },
};

export const catStore = {
  list() { return [...categories]; },
  add(data) {
    const cat = { ...data, id: nextId() };
    categories.push(cat);
    return cat;
  },
  remove(id) { categories = categories.filter((c) => c.id !== id); },
  patch(id, data) {
    const c = categories.find((x) => x.id === id);
    if (c) Object.assign(c, data);
    return c ?? null;
  },
};
