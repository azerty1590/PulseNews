import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { normalizeUrl, fetchFeed, assertSafeUrl, discoverFeedUrls } from '../feedParser.js';

const articlesLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please wait a moment' },
});

const router = Router();

// ---------------------------------------------------------------------------
// Storage backend — Firebase Firestore when credentials are present,
// otherwise fall back to the in-memory store.
// ---------------------------------------------------------------------------
const useFirebase =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

let db; // lazily set if Firebase is available

if (useFirebase) {
  const { feedsCollection } = await import('../firebase.js');
  db = feedsCollection;
}

import { memStore } from '../store.js';

// ---------------------------------------------------------------------------
// Unified CRUD helpers
// ---------------------------------------------------------------------------
async function listFeeds() {
  if (useFirebase) {
    const snap = await db().orderBy('order').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return memStore.list();
}

async function addFeed(data) {
  if (useFirebase) {
    const snap = await db().orderBy('order', 'desc').limit(1).get();
    const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order ?? 0);
    const doc = await db().add({ ...data, order: maxOrder + 1 });
    return { id: doc.id, ...data, order: maxOrder + 1 };
  }
  return memStore.add(data);
}

async function deleteFeed(id) {
  if (useFirebase) return db().doc(id).delete();
  memStore.remove(id);
}

async function reorderAll(orderArr) {
  if (useFirebase) {
    const batch = db().firestore.batch();
    for (const { id, order } of orderArr) batch.update(db().doc(id), { order });
    return batch.commit();
  }
  memStore.reorder(orderArr);
}

async function getFeed(id) {
  if (useFirebase) {
    const doc = await db().doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
  return memStore.get(id);
}

async function patchFeed(id, data) {
  if (useFirebase) {
    await db().doc(id).update(data);
    return { id, ...data };
  }
  return memStore.patch(id, data);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
  try {
    res.json(await listFeeds());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load feeds' });
  }
});

// GET /api/feeds/discover?url=... — returns all RSS feeds found on a page
router.get('/discover', async (req, res) => {
  try {
    const { url: rawUrl } = req.query;
    if (!rawUrl) return res.status(400).json({ error: 'url is required' });
    const url = normalizeUrl(rawUrl);
    const feeds = await discoverFeedUrls(url);
    res.json({ feeds });
  } catch (err) {
    res.status(502).json({ error: err.message ?? 'Discovery failed' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { url: rawUrl, label } = req.body;
    if (!rawUrl) return res.status(400).json({ error: 'url is required' });

    const url = normalizeUrl(rawUrl);
    assertSafeUrl(url);
    const feedMeta = await fetchFeed(url);

    const feed = await addFeed({
      url,
      label: label || feedMeta.title,
      feedTitle: feedMeta.title,
      feedLink: feedMeta.link,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(feed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? 'Failed to add feed' });
  }
});

router.patch('/reorder', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    await reorderAll(order);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder feeds' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ error: 'label is required' });
    const feed = await patchFeed(req.params.id, { label: label.trim() });
    if (!feed) return res.status(404).json({ error: 'Feed not found' });
    res.json(feed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteFeed(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

const articleCache = new Map(); // id → { data, expiresAt }
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

router.get('/:id/articles', articlesLimiter, async (req, res) => {
  try {
    const feed = await getFeed(req.params.id);
    if (!feed) return res.status(404).json({ error: 'Feed not found' });

    const bust = req.query.bust === '1';
    const cached = articleCache.get(req.params.id);
    if (!bust && cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    const data = await fetchFeed(feed.url);
    articleCache.set(req.params.id, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? 'Failed to fetch articles' });
  }
});

export default router;
