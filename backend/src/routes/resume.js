import { Router } from 'express';
import Resume from '../models/Resume.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import Download from '../models/Download.js';
import bcrypt from 'bcryptjs';
import puppeteer from 'puppeteer';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.create({ user: req.user.id, ...req.body });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// Saved AI suggestions: list
router.get('/:id/suggestions', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id }, { suggestions: 1 });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ suggestions: doc.suggestions || [] });
  } catch (err) { next(err); }
});

// Saved AI suggestions: create
router.post('/:id/suggestions', requireAuth, async (req, res, next) => {
  try {
    const { type, text } = req.body;
    if (!type || !text) return res.status(400).json({ message: 'Invalid payload' });
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    doc.suggestions.push({ type, text, createdAt: new Date() });
    await doc.save();
    res.status(201).json({ suggestions: doc.suggestions });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const docs = await Resume.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    // Save a version snapshot before updating
    existing.versions.push({
      title: existing.title,
      template: existing.template,
      sections: existing.sections,
      order: existing.order,
      language: existing.language,
    });
    Object.assign(existing, req.body);
    const updated = await existing.save();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/duplicate', requireAuth, async (req, res, next) => {
  try {
    const source = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!source) return res.status(404).json({ message: 'Not found' });
    const copy = await Resume.create({
      user: req.user.id,
      title: `${source.title} (Copy)`,
      template: source.template,
      sections: source.sections,
      order: source.order,
      language: source.language
    });
    res.status(201).json(copy);
  } catch (err) { next(err); }
});

router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const { isPublic, password, expiresAt } = req.body;
    if (typeof isPublic === 'boolean') {
      doc.isPublic = isPublic;
      if (isPublic && !doc.shareId) doc.shareId = uuidv4();
    }
    if (typeof password === 'string') {
      doc.sharePasswordHash = password ? await bcrypt.hash(password, 10) : undefined;
    }
    if (expiresAt) {
      const ts = new Date(expiresAt);
      doc.shareExpiresAt = isNaN(ts.getTime()) ? undefined : ts;
    }
    await doc.save();
    res.json({ isPublic: doc.isPublic, shareId: doc.shareId, expiresAt: doc.shareExpiresAt ? doc.shareExpiresAt : null, hasPassword: !!doc.sharePasswordHash });
  } catch (err) { next(err); }
});

router.post('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    doc.downloads += 1;
    await doc.save();
    await Download.create({ user: req.user.id, resume: doc._id, type: req.body.type || 'pdf' });
    res.json({ ok: true, downloads: doc.downloads });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Reorder sections
router.post('/:id/reorder', requireAuth, async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ message: 'Invalid order' });
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    doc.order = order;
    await doc.save();
    res.json({ order: doc.order });
  } catch (err) { next(err); }
});

// Explicitly capture a version snapshot
router.post('/:id/version', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    doc.versions.push({
      title: doc.title,
      template: doc.template,
      sections: doc.sections,
      order: doc.order,
      language: doc.language,
    });
    await doc.save();
    res.json({ versions: doc.versions });
  } catch (err) { next(err); }
});

// Restore a previous version
router.post('/:id/restore', requireAuth, async (req, res, next) => {
  try {
    const { versionId } = req.body;
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const v = doc.versions.id(versionId);
    if (!v) return res.status(404).json({ message: 'Version not found' });
    // Save current as version then restore
    doc.versions.push({ title: doc.title, template: doc.template, sections: doc.sections, order: doc.order, language: doc.language });
    doc.title = v.title;
    doc.template = v.template;
    doc.sections = v.sections;
    doc.order = v.order;
    doc.language = v.language;
    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
});

// Export to PDF (server-side render)
router.post('/:id/export/pdf', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:24px}h1{margin:0 0 8px}section{margin:12px 0}</style></head><body>
      <h1>${doc.title}</h1>
      ${(doc.sections||[]).map(s=>`<section><h3>${s.type}</h3><pre>${typeof s.data==='object'?JSON.stringify(s.data,null,2):String(s.data||'')}</pre></section>`).join('')}
    </body></html>`;
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(doc.title||'resume').replace(/[^a-z0-9-_]/gi,'_')}.pdf"`);
    res.send(Buffer.from(pdf));
  } catch (err) { next(err); }
});

export default router;
