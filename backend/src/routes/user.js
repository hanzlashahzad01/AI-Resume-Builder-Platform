import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import Resume from '../models/Resume.js';
import Download from '../models/Download.js';

const router = Router();

// Configure Cloudinary via CLOUDINARY_URL or explicit env vars
if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokenHash -verificationTokenHash -resetTokenHash');
    res.json({ user });
  } catch (err) { next(err); }
});

// Aggregate latest saved AI suggestions across user's resumes
router.get('/suggestions', requireAuth, async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user.id }, { suggestions: 1, title: 1 }).sort({ updatedAt: -1 }).limit(50);
    const list = [];
    for (const r of resumes) {
      for (const s of (r.suggestions || [])) {
        list.push({ resumeId: r._id, resumeTitle: r.title, type: s.type, text: s.text, createdAt: s.createdAt });
      }
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ suggestions: list.slice(0, 20) });
  } catch (err) { next(err); }
});

import fs from 'fs';
import path from 'path';

// Helper to save file locally
const saveLocal = (file, folder) => {
  const ext = file.originalname.split('.').pop();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
  const dir = path.join(process.cwd(), folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, file.buffer);
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/${folder}/${filename}`;
};

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, email, theme } = req.body;
    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof email === 'string' && email.trim()) update.email = email.trim();
    if (theme === 'light' || theme === 'dark') update.theme = theme;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select('-passwordHash -refreshTokenHash -verificationTokenHash -resetTokenHash');
    res.json({ user });
  } catch (err) { next(err); }
});

router.post('/avatar', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer Error:', err);
      return res.status(400).json({ message: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ message: 'File required' });
      console.log('Processing avatar upload:', req.file.originalname, req.file.size);

      const url = saveLocal(req.file, 'avatars');
      console.log('Saved to:', url);

      const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: url }, { new: true })
        .select('-passwordHash -refreshTokenHash -verificationTokenHash -resetTokenHash');
      res.json({ user });
    } catch (err) {
      console.error('Avatar upload error:', err);
      next(err);
    }
  });
});

router.post('/upload', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      if (!req.file) return res.status(400).json({ message: 'File required' });
      const url = saveLocal(req.file, 'uploads');
      res.json({ url });
    } catch (err) { next(err); }
  });
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Invalid request' });
    const user = await User.findById(req.user.id);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Current password incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Dashboard stats for the user
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const [resumes, downloads] = await Promise.all([
      Resume.find({ user: req.user.id }),
      Download.find({ user: req.user.id })
    ]);
    const totalResumes = resumes.length;
    const totalDownloads = downloads.length;
    const totalViews = resumes.reduce((sum, r) => sum + (r.views || 0), 0);
    const recentActivity = downloads
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(d => ({ id: d._id, resume: d.resume, type: d.type, at: d.createdAt }));
    res.json({ totalResumes, totalDownloads, totalViews, recentActivity });
  } catch (err) { next(err); }
});

export default router;
