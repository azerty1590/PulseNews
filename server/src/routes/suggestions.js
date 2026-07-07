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

  let seeded = 0;
  for (const seed of SEEDS) {
    const snap = await col()
      .where('feedUrl', '==', seed.feedUrl)
      .limit(1)
      .get();
    if (snap.empty) {
      await col().add({
        ...seed,
        active: true,
        addedAt: new Date().toISOString(),
      });
      seeded++;
    }
  }
  if (seeded > 0) console.log(`Seeded ${seeded} suggestions`);
  return seeded;
}

// Seed on module load if Firebase is available and collection is empty
if (useFirebase) {
  const snap = await col().limit(1).get();
  if (snap.empty) {
    await upsertSeeds();
  }
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
  const snap = await col().where('active', '==', true).orderBy('addedAt', 'desc').get();
  return snap.docs.map((d) => {
    const { label, url, feedUrl, description, tags, quality, addedAt } = d.data();
    return { id: d.id, label, url, feedUrl, description, tags, quality, addedAt };
  });
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
