import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { feedIdRemap } from './useFeeds.js';

const STORAGE_KEY = 'newsboard:categories';
const ORDER_KEY = 'newsboard:categories:order';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; }
}

function loadOrder() {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY)) ?? []; } catch { return []; }
}

// Reorder a server list to match the locally-saved id order. Ids present in the
// saved order come first (in that order); any new/unknown ids keep their tail
// position. Makes tab order survive reload even without server-side persistence.
function applyLocalOrder(list) {
  const order = loadOrder();
  if (!order.length) return list;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

export function useCategories() {
  const [categories, setCategories] = useState(loadLocal);

  // Sync from server on mount; restore from localStorage if server is empty.
  useEffect(() => {
    api.getCategories()
      .then(async (data) => {
        if (!Array.isArray(data)) return;
        if (data.length > 0) {
          // Apply feedId remap if feeds were just restored (IDs changed after cold start)
          const remap = feedIdRemap.current;
          const remappedRaw = remap
            ? data.map((c) => ({
                ...c,
                feedIds: (c.feedIds ?? []).map((id) => remap.get(id) ?? id),
              }))
            : data;
          // Honour the locally-saved tab order (survives reload even if the
          // server doesn't persist `order`).
          const remapped = applyLocalOrder(remappedRaw);

          // Push any remapped feedIds back to the server
          if (remap) {
            const changed = remapped.filter((c, i) => {
              const orig = data[i];
              return JSON.stringify(c.feedIds) !== JSON.stringify(orig.feedIds);
            });
            if (changed.length) {
              await Promise.all(
                changed.map((c) => api.updateCategory(c.id, { feedIds: c.feedIds }).catch(() => {}))
              );
            }
          }

          setCategories(remapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remapped));
        } else {
          const local = loadLocal();
          if (local.length === 0) return;
          const remap = feedIdRemap.current;
          const restored = [];
          for (const c of local) {
            try {
              const created = await api.addCategory(c.name);
              // Remap feedIds if feeds were re-created with new IDs
              const feedIds = remap
                ? (c.feedIds ?? []).map((id) => remap.get(id) ?? id).filter((id) => remap.has(id) || !remap.size)
                : (c.feedIds ?? []);
              if (feedIds.length) {
                await api.updateCategory(created.id, { feedIds }).catch(() => {});
              }
              restored.push({ ...created, feedIds });
            } catch { restored.push(c); }
          }
          setCategories(restored);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        }
      })
      .catch(() => { /* keep localStorage values */ });
  }, []);

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

  // Reorder categories by moving one id to another id's position.
  const reorderCategories = useCallback((fromId, toId) => {
    if (fromId === toId) return;
    setCategories((prev) => {
      const from = prev.findIndex((c) => c.id === fromId);
      const to = prev.findIndex((c) => c.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Save the id order locally — the source of truth for tab order, so it
      // survives reload regardless of server support.
      localStorage.setItem(ORDER_KEY, JSON.stringify(next.map((c) => c.id)));
      // Best-effort server persistence (ignored if the API doesn't accept order).
      Promise.all(next.map((c, i) => api.updateCategory(c.id, { order: i }).catch(() => {}))).catch(() => {});
      return next;
    });
  }, []);

  const categoryOfFeed = useCallback((feedId) => {
    return categories.find((c) => c.feedIds.includes(feedId)) ?? null;
  }, [categories]);

  // Remove feedIds from categories that no longer exist in the given feed list.
  // Call once after both feeds and categories have loaded.
  const cleanupStaleIds = useCallback((knownFeedIds) => {
    const known = new Set(knownFeedIds);
    setCategories((prev) => {
      const next = prev.map((c) => ({
        ...c,
        feedIds: (c.feedIds ?? []).filter((id) => known.has(id)),
      }));
      const changed = next.filter((c, i) => {
        return JSON.stringify(c.feedIds) !== JSON.stringify(prev[i].feedIds);
      });
      if (!changed.length) return prev; // nothing to do
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      Promise.all(changed.map((c) => api.updateCategory(c.id, { feedIds: c.feedIds }).catch(() => {})));
      return next;
    });
  }, []);

  return { categories, addCategory, renameCategory, deleteCategory, assignFeed, unassignFeed, categoryOfFeed, cleanupStaleIds, reorderCategories };
}
