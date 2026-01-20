import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, role: 1, disabled: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(users);
  } catch (err) { next(err); }
});

router.post('/users/:id/disable', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { disabled: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/users/:id/enable', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { disabled: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
