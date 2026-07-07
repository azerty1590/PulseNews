import { Router } from 'express';
import { catStore } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(catStore.list());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(catStore.add({ name: name.trim(), feedIds: [] }));
});

router.patch('/:id', (req, res) => {
  const { name, feedIds } = req.body;
  const update = {};
  if (name !== undefined) update.name = name.trim();
  if (feedIds !== undefined) update.feedIds = feedIds;
  const cat = catStore.patch(req.params.id, update);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
});

router.delete('/:id', (req, res) => {
  catStore.remove(req.params.id);
  res.json({ ok: true });
});

export default router;
