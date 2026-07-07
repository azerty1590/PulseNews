import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const STORAGE_KEY = 'newsboard:categories';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; }
}

export function useCategories() {
  const [categories, setCategories] = useState(loadLocal);

  // Sync from server on mount; fall back to localStorage if server unreachable
  useEffect(() => {
    api.getCategories()
      .then((data) => {
        setCategories(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      })
      .catch(() => { /* keep localStorage values */ });
  }, []);

  function persist(cats) {
    setCategories(cats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  }

  const addCategory = useCallback(async (name) => {
    try {
      const cat = await api.addCategory(name.trim());
      setCategories((prev) => {
        const next = [...prev, cat];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return cat;
    } catch {
      // optimistic fallback
      const cat = { id: `cat-${Date.now()}`, name: name.trim(), feedIds: [] };
      setCategories((prev) => {
        const next = [...prev, cat];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return cat;
    }
  }, []);

  const renameCategory = useCallback(async (id, name) => {
    setCategories((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, name: name.trim() } : c);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    try { await api.updateCategory(id, { name: name.trim() }); } catch {}
  }, []);

  const deleteCategory = useCallback(async (id) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    try { await api.deleteCategory(id); } catch {}
  }, []);

  const assignFeed = useCallback(async (feedId, categoryId) => {
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) return { ...c, feedIds: c.feedIds.includes(feedId) ? c.feedIds : [...c.feedIds, feedId] };
        return { ...c, feedIds: c.feedIds.filter((id) => id !== feedId) };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // sync each mutated category
      for (const c of next) {
        if (c.id === categoryId || prev.find((p) => p.id === c.id)?.feedIds.includes(feedId)) {
          api.updateCategory(c.id, { feedIds: c.feedIds }).catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const unassignFeed = useCallback(async (feedId) => {
    setCategories((prev) => {
      const next = prev.map((c) => ({ ...c, feedIds: c.feedIds.filter((id) => id !== feedId) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      for (const c of next) {
        if (prev.find((p) => p.id === c.id)?.feedIds.includes(feedId)) {
          api.updateCategory(c.id, { feedIds: c.feedIds }).catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const categoryOfFeed = useCallback((feedId) => {
    return categories.find((c) => c.feedIds.includes(feedId)) ?? null;
  }, [categories]);

  return { categories, addCategory, renameCategory, deleteCategory, assignFeed, unassignFeed, categoryOfFeed };
}
