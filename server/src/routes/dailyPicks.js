import { Router } from 'express';
import { fetchDailyPicks, picksStore } from '../dailyRefresh.js';

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

const COL = process.env.FIRESTORE_PICKS_COLLECTION ?? 'dailyPicks';

let refreshing = false;

async function maybeRefresh(categoryNames = []) {
  if (refreshing) return;
  const { picks, refreshedAt } = await picksStore.get(db, COL);

  const stale = !refreshedAt || Date.now() - new Date(refreshedAt).getTime() > 23 * 60 * 60 * 1000;
  if (!stale) return;

  refreshing = true;
  console.log('[daily-picks] refreshing…');
  try {
    const fresh = await fetchDailyPicks(categoryNames);
    await picksStore.save(db, COL, fresh);
    console.log(`[daily-picks] saved ${fresh.length} picks`);
  } catch (e) {
    console.error('[daily-picks] refresh failed:', e.message);
  } finally {
    refreshing = false;
  }
}

// GET /api/daily-picks?categories=AI,Android,CRM
router.get('/', async (req, res) => {
  try {
    const categoryNames = (req.query.categories ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Kick off a background refresh if stale (non-blocking)
    maybeRefresh(categoryNames).catch(() => {});

    const { picks, refreshedAt } = await picksStore.get(db, COL);

    res.json({ picks: picks ?? [], refreshedAt: refreshedAt ?? null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/daily-picks/refresh — force a manual refresh
router.post('/refresh', async (req, res) => {
  try {
    const categoryNames = (req.body.categories ?? []);
    const fresh = await fetchDailyPicks(categoryNames);
    const refreshedAt = await picksStore.save(db, COL, fresh);
    res.json({ ok: true, count: fresh.length, refreshedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
