import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const STORAGE_KEY = 'newsboard:categories';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; }
}

export function useCategories() {
  const [categories, setCategories] = useState(loadLocal);

  // Sync from server on mount; only overwrite localStorage if server has data.
  useEffect(() => {
    api.getCategories()
      .then((data) => {
        if (data.length > 0) {
          setCategories(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        // Server returned empty — keep localStorage as-is (server likely just restarted)
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

  const assignFeed = useCallback((feedId, categoryId) => {
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.id === categoryId) return { ...c, feedIds: c.feedIds.includes(feedId) ? c.feedIds : [...c.feedIds, feedId] };
        return { ...c, feedIds: c.feedIds.filter((id) => id !== feedId) };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Find affected categories and sync — done here so we have both prev and next
      const affected = next.filter((c) => {
        const old = prev.find((p) => p.id === c.id);
        return JSON.stringify(old?.feedIds) !== JSON.stringify(c.feedIds);
      });
      Promise.all(affected.map((c) => api.updateCategory(c.id, { feedIds: c.feedIds }))).catch(() => {});
      return next;
    });
  }, []);

  const unassignFeed = useCallback((feedId) => {
    setCategories((prev) => {
      const next = prev.map((c) => ({ ...c, feedIds: c.feedIds.filter((id) => id !== feedId) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      const affected = next.filter((c) => {
        const old = prev.find((p) => p.id === c.id);
        return JSON.stringify(old?.feedIds) !== JSON.stringify(c.feedIds);
      });
      Promise.all(affected.map((c) => api.updateCategory(c.id, { feedIds: c.feedIds }))).catch(() => {});
      return next;
    });
  }, []);

  const categoryOfFeed = useCallback((feedId) => {
    return categories.find((c) => c.feedIds.includes(feedId)) ?? null;
  }, [categories]);

  return { categories, addCategory, renameCategory, deleteCategory, assignFeed, unassignFeed, categoryOfFeed };
}
