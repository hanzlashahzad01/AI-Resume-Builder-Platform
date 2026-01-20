import { Router } from 'express';
import Resume from '../models/Resume.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/resume/:shareId', async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ shareId: req.params.shareId, isPublic: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (doc.shareExpiresAt && doc.shareExpiresAt < new Date()) return res.status(410).json({ message: 'Link expired' });
    if (doc.sharePasswordHash) {
      const pwd = (req.query.password || '').toString();
      if (!pwd) return res.status(401).json({ message: 'Password required' });
      const ok = await bcrypt.compare(pwd, doc.sharePasswordHash);
      if (!ok) return res.status(401).json({ message: 'Invalid password' });
    }
    doc.views += 1;
    await doc.save();
    const { _id, user, ...publicData } = doc.toObject();
    res.json(publicData);
  } catch (err) { next(err); }
});

export default router;
