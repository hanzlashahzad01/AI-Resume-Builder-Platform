import { Router } from 'express';
import Template from '../models/Template.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try { res.json(await Template.find({ active: true })); }
  catch (err) { next(err); }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try { const t = await Template.create(req.body); res.status(201).json(t); }
  catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try { await Template.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (err) { next(err); }
});

export default router;
