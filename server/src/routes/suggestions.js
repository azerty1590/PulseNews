import { Router } from 'express';
import { SEEDS } from '../suggestionsSeed.js';

const router = Router();

const useFirebase =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

let db;
if (useFirebase) {
  const { db: firestore } = await import('../firebase.js');
  db = firestore;
}

const col = () =>
  db.collection(process.env.FIRESTORE_SUGGESTIONS_COLLECTION ?? 'suggestions');

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map();
if (!useFirebase) {
  for (const seed of SEEDS) {
    memStore.set(seed.feedUrl, {
      id: seed.feedUrl,
      ...seed,
      active: true,
      addedAt: new Date().toISOString(),
    });
  }
}

// ── Simple GET cache ──────────────────────────────────────────────────────────
let cache = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function bustCache() {
  cache = null;
  cacheExpiresAt = 0;
}

// ── Seeding ───────────────────────────────────────────────────────────────────
async function upsertSeeds() {
  if (!useFirebase) return 0;

  // Fetch all existing feedUrls in one query instead of N individual queries
  const existing = await col().select('feedUrl').get();
  const knownUrls = new Set(existing.docs.map((d) => d.data().feedUrl));

  const toAdd = SEEDS.filter((s) => !knownUrls.has(s.feedUrl));
  if (toAdd.length === 0) return 0;

  // Write in batches of 500 (Firestore batch limit)
  const now = new Date().toISOString();
  let seeded = 0;
  for (let i = 0; i < toAdd.length; i += 500) {
    const batch = db.batch();
    for (const seed of toAdd.slice(i, i + 500)) {
      batch.set(col().doc(), { ...seed, active: true, addedAt: now });
      seeded++;
    }
    await batch.commit();
  }
  console.log(`Seeded ${seeded} suggestions`);
  return seeded;
}

// Seed asynchronously after startup — do NOT block module load
if (useFirebase) {
  col().limit(1).get()
    .then((snap) => { if (snap.empty) return upsertSeeds(); })
    .catch((err) => console.error('Suggestions seed error:', err.message));
}

// ── Route helpers ─────────────────────────────────────────────────────────────
function memList() {
  return [...memStore.values()]
    .filter((s) => s.active)
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .map(({ id, label, url, feedUrl, description, tags, quality, addedAt }) => ({
      id,
      label,
      url,
      feedUrl,
      description,
      tags,
      quality,
      addedAt,
    }));
}

async function firestoreList() {
  // No orderBy — avoids needing a composite index. Client sorts by addedAt.
  const snap = await col().where('active', '==', true).get();
  return snap.docs
    .map((d) => {
      const { label, url, feedUrl, description, tags, quality, addedAt } = d.data();
      return { id: d.id, label, url, feedUrl, description, tags, quality, addedAt };
    })
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now < cacheExpiresAt) {
      return res.json(cache);
    }

    const result = useFirebase ? await firestoreList() : memList();

    cache = result;
    cacheExpiresAt = now + CACHE_TTL_MS;

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed', async (req, res) => {
  try {
    bustCache();
    if (!useFirebase) {
      // In-memory: add any seeds not already present
      let seeded = 0;
      for (const seed of SEEDS) {
        if (!memStore.has(seed.feedUrl)) {
          memStore.set(seed.feedUrl, {
            id: seed.feedUrl,
            ...seed,
            active: true,
            addedAt: new Date().toISOString(),
          });
          seeded++;
        }
      }
      return res.json({ seeded });
    }

    const seeded = await upsertSeeds();
    res.json({ seeded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
