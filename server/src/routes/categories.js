import { Router } from 'express';
import { catStore } from '../store.js';

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

const col = () => db.collection(process.env.FIRESTORE_CATS_COLLECTION ?? 'categories');

async function listCats() {
  if (useFirebase) {
    const snap = await col().get();
    const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by explicit order when present; undated fall back to createdAt.
    cats.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1;
    });
    return cats;
  }
  return catStore.list();
}

async function addCat(data) {
  if (useFirebase) {
    // Assign next order = current count, so new categories append to the end.
    const snap = await col().get();
    const order = snap.size;
    const doc = await col().add({ ...data, order, createdAt: new Date().toISOString() });
    return { id: doc.id, ...data, order };
  }
  return catStore.add(data);
}

async function patchCat(id, data) {
  if (useFirebase) {
    await col().doc(id).update(data);
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }
  return catStore.patch(id, data);
}

async function removeCat(id) {
  if (useFirebase) return col().doc(id).delete();
  catStore.remove(id);
}

router.get('/', async (req, res) => {
  try { res.json(await listCats()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try { res.status(201).json(await addCat({ name: name.trim(), feedIds: [] })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  const { name, feedIds, order } = req.body;
  const update = {};
  if (name !== undefined) update.name = name.trim();
  if (feedIds !== undefined) update.feedIds = feedIds;
  if (order !== undefined) update.order = order;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'nothing to update' });
  try {
    const cat = await patchCat(req.params.id, update);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await removeCat(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
